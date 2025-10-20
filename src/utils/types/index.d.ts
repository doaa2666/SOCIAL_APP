import type { IUser } from "../../DB/model/User.model";

type AuthUser = Partial<IUser> & { _id?: any } | null;

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      decoded?: any;
    }
  }
}

export {};
