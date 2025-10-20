import { z } from "zod";
import type { ZodError, ZodType } from "zod";
import { NextFunction, Response, Request } from "express";
import { BadRequestException } from "../utils/response/error.response";

type KeyReqType = keyof Request;
type SchemaType = Partial<Record<KeyReqType, ZodType>>;
type validationErrorsType = Array<{
  key: KeyReqType;
  issues: Array<{ message: string; path: string | number | symbol | undefined }>;
}>;

export const validation = (schema: SchemaType) => {
  return (req: Request, res: Response, next: NextFunction): NextFunction => {
    const validationErrors: validationErrorsType = [];

    for (const key of Object.keys(schema) as KeyReqType[]) {
      const validator = schema[key];
      if (!validator) continue;

      const validationResult = validator.safeParse(req[key]);
      if (!validationResult.success) {
        const errors = validationResult.error as ZodError;
        validationErrors.push({
          key,
          issues: errors.issues.map((issue) => ({
            message: issue.message,
            path: issue.path[0],
          })),
        });
      }
    }

    if (validationErrors.length) {
      throw new BadRequestException("validation error", { validationErrors });
    }

    return next() as unknown as NextFunction;
  };
};

export const generlaFields = {
  username: z
    .string({
     message: "username is required" ,
    })
    .min(2, { message: "min username length is 2 char" })
    .max(20, { message: "max username length is 20 char" }),

  email: z.string().email({ message: "valid email must be like example@domain.com" }),

  otp: z.string().regex(/^\d{6}$/, { message: "OTP must be 6 digits" }),

  password: z
    .string()
    .regex(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/, {
      message:
        "password must be strong (min 8 chars, upper, lower, number, special char)",
    }),

  confirmPassword: z.string(),

  gender: z.enum(["male", "female"], {
    message: "gender must be either male or female",
  }),
};
