// import old interface (مش محتاجينه دلوقتي)
// export interface IsignupBodyInputsDTO {
//   username: string;
//   email: string;
//   password: string;
// }

import * as validators from './auth.validation';
import { z } from 'zod';

// Signup DTO
export type IsignupBodyInputsDTO = z.infer<typeof validators.signup.body>;

// Confirm Email DTO
export type IConfirmEmailBodyInputsDTO = z.infer<typeof validators.confirmEmail.body>;

// Login DTO
export type ILoginBodyInputsDTO = z.infer<typeof validators.login.body>;

// Signup with Gmail DTO
export type IGmailDTO = z.infer<typeof validators.signupWithGmail.body>;

//Forgot Password: Send Code
export type IForgotCodeBodyInputsDTO = z.infer<typeof validators.sendForgotPasswordCode.body>;

// Forgot Password: Verify Code
export type IVerifyForgotPasswordBodyInputsDTO = z.infer<typeof validators.verifyForgotPassword.body>;

// Forgot Password: Reset Password
export type IResetForgotPasswordBodyInputsDTO = z.infer<typeof validators.resetForgotPassword.body>;
