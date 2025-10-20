import z from "zod";
import * as validators from "./user.validation";

export type ILogoutDto = z.infer<typeof validators.logout.body>;
export type IUpdateBasicInfoDto = z.infer<typeof validators.updateBasicInfo.body>;
export type IUpdatePasswordDto = z.infer<typeof validators.updatePassword.body>;
export type IUpdateEmailDto = z.infer<typeof validators.updateEmail.body>;
export type IFreezeAccountDTO = z.infer<typeof validators.freezeAccount.params>;
export type IRestoreAccountDTO = z.infer<typeof validators.restoreAccount.params>;
export type IHardDeleteAccountDTO = z.infer<typeof validators.hardDelete.params>;

