import { z } from "zod";
import { LogoutEnum } from "../../utils/security/token.security";
import { Types } from "mongoose";

// ================== LOGOUT ==================
export const logout = {
  body: z.strictObject({
    flag: z.enum([LogoutEnum.only, LogoutEnum.all]).default(LogoutEnum.only),
  }),
};
//=============================
export const freezeAccount = {
  params:z.object({
    userId:z.string().optional(),
  }).optional().refine(data=>{
    return data?.userId ? Types.ObjectId.isValid(data.userId) : true;
  }, {error:"invalid objectId format "
    , path:["userId"]}),
}
//===============================
export const restoreAccount = {
  params:z.object({
    userId:z.string(),
  }).refine(data=>{
    return Types.ObjectId.isValid(data.userId);
  }, {error:"invalid objectId format "
    , path:["userId"]}),
}
// ================== UPDATE BASIC INFO ==================
export const updateBasicInfo = {
  body: z
    .strictObject({
      userName: z.string().min(3).max(30).optional(),
      age: z.number().min(10).max(100).optional(),
    
      phone: z
        .string()
        .regex(/^01[0-9]{9}$/, "Phone must be a valid Egyptian number")
        .optional(),
      bio: z.string().max(200).optional(),
    })
    .refine(
      (data) => Object.keys(data).length > 0,
      "At least one field must be provided"
    ),
};

// ================== UPDATE PASSWORD ==================
export const updatePassword = {
  body: z.strictObject({
    oldPassword: z.string().min(6, "Old password is too short"),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters")
      .refine(
        (val) => /[A-Z]/.test(val) && /\d/.test(val),
        "Password must contain at least one uppercase letter and one number"
      ),
  }),
};

// ================== UPDATE EMAIL (OTP FLOW) ==================
export const updateEmail = {
  body: z.strictObject({
    newEmail: z.string().email("Invalid email format"),
    otp: z
      .string()
      .length(6, "OTP must be exactly 6 digits")
      .regex(/^\d+$/, "OTP must contain only digits"),
  }),
};

export const hardDelete = restoreAccount;
