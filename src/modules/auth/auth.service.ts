import type { Request, Response } from "express";
import type {
  IConfirmEmailBodyInputsDTO,
  IForgotCodeBodyInputsDTO,
  IGmailDTO,
  ILoginBodyInputsDTO,
  IResetForgotPasswordBodyInputsDTO,
  IsignupBodyInputsDTO,
  IVerifyForgotPasswordBodyInputsDTO,
} from "./auth.dto";
import { ProviderEnum, UserModel } from "../../DB/model/User.model";
import { UserRepository } from "../../DB/repositry/user.repository";
import {
  BadRequestException,
  ConflictException,
  NotfoundException,
} from "../../utils/response/error.response";
import { compareHash, generateHash } from "../../utils/security/hash.security";
import { emailEvent } from "../../utils/email/email.event";
import { generateNumberOtp } from "../../utils/otp";
import { createLoginCredentials } from "../../utils/security/token.security";
import { OAuth2Client, type TokenPayload } from "google-auth-library";
import { successResponse } from "../../utils/response/success.response";
import { ILoginResponse } from "./auth.entities";

class AuthenticationService {
  private userModel = new UserRepository(UserModel);

  constructor() {}

  // =================== GMAIL VERIFICATION ===================
  private async verifyGmailAccount(idToken: string): Promise<TokenPayload> {
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.WEB_CLIENT_IDS?.split(",") || [],
    });
    const payload = ticket.getPayload();

    if (!payload?.email_verified) {
      throw new BadRequestException("Fail to verify this Google account");
    }
    return payload;
  }

  // =================== LOGIN WITH GMAIL ===================
  loginWithGmail = async (req: Request, res: Response): Promise<Response> => {
    const { idToken }: IGmailDTO = req.body;
    const { email } = await this.verifyGmailAccount(idToken);

    const user = await this.userModel.findOne({
      filter: { email, provider: ProviderEnum.GOOGLE },
    });

    if (!user) {
      throw new NotfoundException(
        "Not registered account or registered with another provider"
      );
    }

    const credentials = await createLoginCredentials(user);

    // NOTE: Some projects had a typo in the ILoginResponse interface named 'credentils'.
    // If your ILoginResponse expects 'credentials' instead, change the key to 'credentials'
    // or better: fix the interface to use 'credentials' (recommended).
    return successResponse<ILoginResponse>({ res, data: { credentils: credentials as any } });
  };

  // =================== SIGNUP WITH GMAIL ===================
  signupWithGmail = async (req: Request, res: Response): Promise<Response> => {
    const { idToken }: IGmailDTO = req.body;
    const { email, family_name, given_name, picture } =
      await this.verifyGmailAccount(idToken);

    const user = await this.userModel.findOne({ filter: { email } });
    if (user) {
      if (user.provider === ProviderEnum.GOOGLE) {
        return await this.loginWithGmail(req, res);
      }
      throw new ConflictException(
        `Email exists with another provider ::: ${user.provider}`
      );
    }

    const [newUser] =
      (await this.userModel.create({
        data: [
          {
            firstName: given_name as string,
            lastName: family_name as string,
            email: email as string,
            profileImage: picture as string,
            confirmAt: new Date(),
            provider: ProviderEnum.GOOGLE,
          },
        ],
      })) || [];

    if (!newUser) {
      throw new BadRequestException(
        "Fail to signup with Gmail, please try again later"
      );
    }

    const credentials = await createLoginCredentials(newUser);
    return successResponse<ILoginResponse>({
      res,
      statusCode: 201,
      data: { credentils: credentials as any },
    });
  };

  // =================== SIGNUP (SYSTEM) ===================
  signup = async (req: Request, res: Response): Promise<Response> => {
    const { username, email, password }: IsignupBodyInputsDTO = req.body;

    const checkUserExist = await this.userModel.findOne({
      filter: { email },
      select: "email",
      options: { lean: true },
    });

    if (checkUserExist) {
      throw new ConflictException("Email exist");
    }

    const otp = generateNumberOtp();
    await this.userModel.createUser({
      data: [
        {
          userName: username,
          email,
          password: await generateHash(password),
          confirmEmailOtp: await generateHash(String(otp)),
        },
      ],
    });

    emailEvent.emit("confirmEmail", { to: email, otp });
    return successResponse({ res, statusCode: 201 });
  };

  // =================== CONFIRM EMAIL ===================
 confirmEmail = async (req: Request, res: Response): Promise<Response> => {
  const { email, otp }: IConfirmEmailBodyInputsDTO = req.body;

  const user = await this.userModel.findOne({
    filter: {
      email,
      confirmEmailOtp: { $exists: true },
      $or: [{ confirmAt: null }, { confirmAt: { $exists: false } }],
    },
  });

  if (!user) throw new NotfoundException("Invalid account");

  if (!(await compareHash(otp, user.confirmEmailOtp as string))) {
    throw new ConflictException("Invalid confirmation code");
  }

  await this.userModel.updateOne({
    filter: { email },
    update: { confirmAt: new Date(), $unset: { confirmEmailOtp: 1 } },
  });

  return successResponse({ res, message: "Email confirmed successfully" });
};


  // =================== LOGIN (SYSTEM) ===================
  login = async (req: Request, res: Response): Promise<Response> => {
    const { email, password }: ILoginBodyInputsDTO = req.body;

    const user = await this.userModel.findOne({
      filter: { email, provider: ProviderEnum.SYSTEM },
    });

    if (!user) throw new NotfoundException("Invalid login data");
    if (!user.confirmAt) throw new BadRequestException("Verify your account first");

    if (!(await compareHash(password, user.password))) {
      throw new NotfoundException("Invalid login data");
    }

    const credentials = await createLoginCredentials(user);
    return successResponse<ILoginResponse>({ res, data: { credentils: credentials as any } });
  };

  // =================== SEND FORGOT CODE ===================
  sendForgotCode = async (req: Request, res: Response): Promise<Response> => {
    const { email }: IForgotCodeBodyInputsDTO = req.body;

    const user = await this.userModel.findOne({
      filter: {
        email,
        provider: ProviderEnum.SYSTEM,
        confirmAt: { $exists: true },
      },
    });

    if (!user) {
      throw new NotfoundException(
        "Invalid account due to one of the following reasons [not registered, invalid provider, not confirmed account]"
      );
    }

    const otp = generateNumberOtp();
    const result = await this.userModel.updateOne({
      filter: { email },
      update: { resetPasswordOtp: await generateHash(String(otp)) },
    });

    if (!(result as any).matchedCount) {
      throw new BadRequestException(
        "Fail to send the reset code, please try again later"
      );
    }

    emailEvent.emit("resetPassword", { to: email, otp });
    return successResponse({ res });
  };

  // =================== VERIFY FORGOT PASSWORD ===================
  verifyForgotPassword = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const { email, otp }: IVerifyForgotPasswordBodyInputsDTO = req.body;

    const user = await this.userModel.findOne({
      filter: {
        email,
        provider: ProviderEnum.SYSTEM,
        resetPasswordOtp: { $exists: true },
      },
    });

    if (!user) {
      throw new NotfoundException(
        "Invalid account due to one of the following reasons [not registered, invalid provider, not confirmed account, missing resetPasswordOtp]"
      );
    }

    if (!(await compareHash(otp, user.resetPasswordOtp as string))) {
      throw new ConflictException("Invalid OTP");
    }

    return successResponse({ res });
  };

  // =================== RESET PASSWORD ===================
  resetForgotPssword = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const { email, otp, password }: IResetForgotPasswordBodyInputsDTO =
      req.body;

    const user = await this.userModel.findOne({
      filter: {
        email,
        provider: ProviderEnum.SYSTEM,
        resetPasswordOtp: { $exists: true },
      },
    });

    if (!user) {
      throw new NotfoundException(
        "Invalid account due to one of the following reasons [not registered, invalid provider, not confirmed account, missing resetPasswordOtp]"
      );
    }

    if (!(await compareHash(otp, user.resetPasswordOtp as string))) {
      throw new ConflictException("Invalid OTP");
    }

    const result = await this.userModel.updateOne({
      filter: { email },
      update: {
        password: await generateHash(password),
        changeCredentialTime: new Date(),
        $unset: { resetPasswordOtp: 1 },
      },
    });

    if (!(result as any).matchedCount) {
      throw new BadRequestException("Fail to reset account password");
    }

    return successResponse({ res });
  };
}

export default new AuthenticationService();
