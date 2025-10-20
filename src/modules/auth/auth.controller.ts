import { Router } from "express";
import * as validators from "./auth.validation";
import { validation } from "../../middleware/validation.middleware";
import authService from "./auth.service";

const router: Router = Router();

// ===========================
// 🟢 AUTH ROUTES
// ===========================

// Signup
router.post(
  "/signup",
  validation(validators.signup),
  authService.signup
);

// Confirm Email
router.patch(
  "/confirm-email",
  validation(validators.confirmEmail),
  authService.confirmEmail
);

// Signup with Gmail
router.post(
  "/signup-gmail",
  validation(validators.signupWithGmail),
  authService.signupWithGmail
);

// Login with Gmail
router.post(
  "/login-gmail",
  validation(validators.signupWithGmail),
  authService.loginWithGmail
);

// Login
router.post(
  "/login",
  validation(validators.login),
  authService.login
);

// Send Forgot Password Code
router.patch(
  "/send-forgot-password",
  validation(validators.sendForgotPasswordCode),
  authService.sendForgotCode
);

// Verify Forgot Password Code
router.patch(
  "/verify-forgot-password",
  validation(validators.verifyForgotPassword),
  authService.verifyForgotPassword
);

// Reset Password
router.patch(
  "/reset-forgot-password",
  validation(validators.resetForgotPassword),
  authService.resetForgotPssword
);

export default router;
