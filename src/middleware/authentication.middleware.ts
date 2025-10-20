import type { NextFunction, Request, Response } from "express";
import { decodeToken, TokenEnum } from "../utils/security/token.security";
import {
  BadRequestException,
  ForbiddenException,
} from "../utils/response/error.response";
import { RoleEnum, IUser } from "../DB/model/User.model";
import { ObjectId } from "mongoose";

//  عرّف النوع البسيط للمستخدم بعد الـ lean()
type AuthUser = IUser & { _id: ObjectId };

// وسّع الـ Request interface
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      decoded?: any;
    }
  }
}

// ===========================
//  Authentication Middleware
export const authentication = (tokenType: TokenEnum = TokenEnum.access) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.headers.authorization) {
      throw new BadRequestException("validation error", {
        key: "headers",
        issues: [{ path: "authorization", message: "missing authorization" }],
      });
    }

    const { decoded, user } = await decodeToken({
      authorization: req.headers.authorization,
      tokenType,
    });

    if (!user) {
      throw new ForbiddenException("Invalid token or user not found");
    }

   
    req.user = user as any;
    req.decoded = decoded;
    next();
  };
};

// ===========================
// Authorization Middleware
export const authorization = (
  accessRoles: RoleEnum[] = [],
  tokenType: TokenEnum = TokenEnum.access
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.headers.authorization) {
      throw new BadRequestException("validation error", {
        key: "headers",
        issues: [{ path: "authorization", message: "missing authorization" }],
      });
    }

    const { decoded, user } = await decodeToken({
      authorization: req.headers.authorization,
      tokenType,
    });

    if (!user) {
      throw new ForbiddenException("Invalid token or user not found");
    }

    const typedUser = user as any;

    if (!accessRoles.includes(typedUser.role)) {
      throw new ForbiddenException("Not authorized account");
    }

    req.user = typedUser;
    req.decoded = decoded;
    next();
  };
};
