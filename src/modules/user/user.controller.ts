import { Router } from "express";
import userService from "./user.service";
import { authorization, authentication } from "../../middleware/authentication.middleware";
import { endPoint } from "./user.authorization";
import { validation } from "../../middleware/validation.middleware";
import * as validators from "./user.validation";
import { TokenEnum } from "../../utils/security/token.security";
import { cloudFileUpload, fileValidation, StorageEnum } from "../../utils/multer/cloud.multer";

const router = Router();

// ================= Freeze Account =================
router.delete(
  "/:userId/freeze-account",
  authentication(),
  validation(validators.freezeAccount),
  userService.freezeAccount
);

// ================= Restore Account =================
router.patch(
  "/:userId/restore-account",
  authorization(endPoint.restoreAccount),
  validation(validators.restoreAccount),
  userService.restoreAccount
);

// ================= Hard Delete =================
router.delete(
  "/:userId",
  authorization(endPoint.hardDelete),
  validation(validators.freezeAccount),
  userService.hardDeleteAccount
);

// ================= Profile Image =================
router.patch(
  "/profile-image",
  authentication(),
  cloudFileUpload({
    validation: fileValidation.image,
    storageApproach: StorageEnum.disk, // مهم جدًا
  }).single("image"), // عشان صورة واحدة فقط
  userService.profileImage
);

// ================= Profile Cover Image =================
router.patch(
  "/profile-cover-image",
  authentication(),
  cloudFileUpload({
    validation: fileValidation.image,
    storageApproach: StorageEnum.disk, //  تمام
  }).array("images", 2),
  userService.profileCoverImage
);


// ================= Profile =================
router.get(
  "/",
  authorization(endPoint.profile),
  userService.profile
);

// ================= Logout =================
router.post(
  "/logout",
  authentication(),
  validation(validators.logout),
  userService.logout
);

// ================= Refresh Token =================
router.post(
  "/refresh_token",
  authentication(TokenEnum.refresh),
  userService.refreshToken
);

// ================= Update Basic Info =================
router.patch(
  "/update-basic-info",
  authentication(),
  validation(validators.updateBasicInfo),
  userService.updateBasicInfo
);

// ================= Update Password =================
router.patch(
  "/update-password",
  authentication(),
  validation(validators.updatePassword),
  userService.updatePassword
);

// ================= Update Email =================
router.patch(
  "/update-email",
  authentication(),
  validation(validators.updateEmail),
  userService.updateEmail
);

// ================= Get Profile =================
router.get(
  "/get-profile",
  authentication(),
  userService.getProfile
);
router.get(
  "/get-profile/:id",
  authentication(),
  userService.getProfile
);

// ================= Share Profile =================
router.get(
  "/share-profile/:id",
  authentication(),
  userService.shareProfile
);

export default router;
