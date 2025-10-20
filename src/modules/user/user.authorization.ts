import { RoleEnum } from "../../DB/model/User.model";
export const endPoint = {
  // المستخدم العادي والإدمن يقدروا يشوفوا البروفايل
  profile: [RoleEnum.user, RoleEnum.admin],

  // المستخدم العادي والإدمن يقدروا يشاركوا البروفايل
  shareProfile: [RoleEnum.user, RoleEnum.admin],

  // المستخدم العادي بس هو اللي يقدر يحدث بروفايله
  updateProfile: [RoleEnum.user],

  // الإدمن فقط هو اللي يقدر يحذف بروفايل
  deleteProfile: [RoleEnum.admin],

  //========
   restoreAccount: [RoleEnum.admin],

    hardDelete: [RoleEnum.admin],

};
