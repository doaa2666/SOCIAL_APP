import { v4 as uuid } from "uuid";
import type { JwtPayload, Secret, SignOptions } from "jsonwebtoken";
import { sign, verify } from "jsonwebtoken";
import mongoose from "mongoose";
import { HUserDocument, RoleEnum, UserModel } from "../../DB/model/User.model";
import { BadRequestException, UnauthorizedException } from "../response/error.response";
import { UserRepository } from "../../DB/repositry/user.repository";
import { TokenRepository } from "../../DB/repositry/token.repositry";
import { HTokenDocument, TokenModel } from "../../DB/model/Token.model";

export enum signatureLevelEnum {
  Bearer = "Bearer",
  System = "System",
}
export enum TokenEnum {
  access = "access",
  refresh = "refresh",
}
export enum LogoutEnum {
  only = "only",
  all = "all",
}

export const generateToken = async ({
  payload,
  secret = process.env.ACCESS_USER_TOKEN_SIGNATURE as string,
  options = { expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRES_IN) },
}: {
  payload: object;
  secret?: Secret;
  options?: SignOptions;
}): Promise<string> => {
  return sign(payload, secret, options);
};

export const verifyToken = async ({
  token,
  secret = process.env.ACCESS_USER_TOKEN_SIGNATURE as string,
}: {
  token: string;
  secret?: Secret;
}): Promise<JwtPayload> => {
  return verify(token, secret) as JwtPayload;
};

export const detectSignatureLevel = async (
  role: RoleEnum = RoleEnum.user
): Promise<signatureLevelEnum> => {
  let signatureLevel: signatureLevelEnum = signatureLevelEnum.Bearer;
  switch (role) {
    case RoleEnum.admin:
      signatureLevel = signatureLevelEnum.System;
      break;
    default:
      signatureLevel = signatureLevelEnum.Bearer;
      break;
  }
  return signatureLevel;
};

export const getSignatures = async (
  signatureLevel: signatureLevelEnum = signatureLevelEnum.Bearer
): Promise<{ access_signature: string; refresh_signature: string }> => {
  let signatures = { access_signature: "", refresh_signature: "" };

  switch (signatureLevel) {
    case signatureLevelEnum.System:
      signatures.access_signature = process.env.ACCESS_SYSTEM_TOKEN_SIGNATURE as string;
      signatures.refresh_signature = process.env.REFRESH_SYSTEM_TOKEN_SIGNATURE as string;
      break;
    default:
      signatures.access_signature = process.env.ACCESS_USER_TOKEN_SIGNATURE as string;
      signatures.refresh_signature = process.env.REFRESH_USER_TOKEN_SIGNATURE as string;
      break;
  }

  return signatures;
};

// Accepts either a mongoose document or a plain object user
export const createLoginCredentials = async (user: HUserDocument | any) => {
  const signatureLevel = await detectSignatureLevel((user.role as RoleEnum) ?? RoleEnum.user);
  const signatures = await getSignatures(signatureLevel);
  const jwtid = uuid();

  const access_token = await generateToken({
    payload: { _id: String(user._id) },
    secret: signatures.access_signature,
    options: { expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRES_IN), jwtid },
  });

  const refresh_token = await generateToken({
    payload: { _id: String(user._id) },
    secret: signatures.refresh_signature,
    options: { expiresIn: Number(process.env.REFRESH_TOKEN_EXPIRES_IN), jwtid },
  });

  return { access_token, refresh_token };
};

export const decodeToken = async ({
  authorization,
  tokenType = TokenEnum.access,
}: {
  authorization: string;
  tokenType?: TokenEnum;
}) => {
  const userModel = new UserRepository(UserModel);
  const tokenModel = new TokenRepository(TokenModel);

  // expected format: "Bearer <token>" or "System <token>"
  const [bearerKey, token] = authorization.split(" ");
  if (!bearerKey || !token) {
    throw new UnauthorizedException("Missing token parts");
  }

  const signatures = await getSignatures(
    bearerKey === signatureLevelEnum.System ? signatureLevelEnum.System : signatureLevelEnum.Bearer
  );

  const decoded = await verifyToken({
    token,
    secret:
      tokenType === TokenEnum.refresh
        ? signatures.refresh_signature
        : signatures.access_signature,
  });

  if (!decoded?._id || !decoded?.iat) {
    throw new BadRequestException("Invalid token payload");
  }

  // check revoked tokens by jti
  if (await tokenModel.findOne({ filter: { jti: (decoded as any).jti } })) {
    throw new UnauthorizedException("Invalid or old login credentials");
  }

  const user = await userModel.findOne({ filter: { _id: String((decoded as any)._id) } });
  if (!user) {
    throw new BadRequestException("Not registered account");
  }

  if ((user.changeCredentialTime?.getTime() || 0) > decoded.iat * 1000) {
    throw new UnauthorizedException("Invalid or old login credentials");
  }

  return { user, decoded };
};

export const createRevokeToken = async (
  decoded: JwtPayload
): Promise<HTokenDocument> => {
  const tokenModel = new TokenRepository(TokenModel);

  const [result] =
    (await tokenModel.create({
      data: [
        {
          jti: (decoded as any)?.jti as string,
          expiresIn:
            (decoded.iat as number) + Number(process.env.REFRESH_TOKEN_EXPIRES_IN),
          userId: new mongoose.Types.ObjectId(String((decoded as any)._id)),
        },
      ],
    })) || [];

  if (!result) {
    throw new BadRequestException("Fail to revoke this token");
  }

  return result;
};
