import { model, models, Schema, HydratedDocument, Types } from "mongoose";

export enum GenderEnum {
  male = "male",
  female = "female",
}

export enum RoleEnum {
  user = "user",
  admin = "admin",
}

export enum ProviderEnum {
  GOOGLE = "GOOGLE",
  SYSTEM = "SYSTEM",
}

export interface IUser {
   profileImage?: string;
    temProfileImage?: string;
  coverImages?: string[];

  firstName: string;
  lastName: string;
  username?: string;
  userName?: string;
  age?: number;
  bio?: string;

  email: string;
  confirmEmailOtp?: string;
  confirmAt?: Date;

  password: string;
  confirmPasswordOtp?: string;
  resetPasswordOtp?: string;
  changeCredentialTime?: Date;

  phone?: string;
  address?: string;
freezedAt?:Date;
freezedBy?:Types.ObjectId;
restoredAt?:Date;
restoredBy?:Types.ObjectId;

  gender: GenderEnum;
  role: RoleEnum;
  provider: ProviderEnum;
  createdAt: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, minlength: 2, maxlength: 25 },
    lastName: { type: String, minlength: 2, maxlength: 25 },

    email: { type: String, required: true, unique: true },
    confirmEmailOtp: { type: String },
    confirmAt: { type: Date, default: null },

    password: {
      type: String,
      required: function () {
        return this.provider === ProviderEnum.GOOGLE ? false : true;
      },
    },

    resetPasswordOtp: { type: String },
    phone: { type: String },
    address: { type: String },
    userName: { type: String },
    age: { type: Number },
    bio: { type: String },

  freezedAt:Date,
  freezedBy:{type:Types.ObjectId, ref:"User"}, 
restoredAt:Date,
restoredBy:{type:Types.ObjectId, ref:"User"},

    profileImage: { type: String },
    temProfileImage:String,
    coverImages: [String],
    gender: {
      type: String,
      enum: Object.values(GenderEnum),
      default: GenderEnum.male,
    },
    role: {
      type: String,
      enum: Object.values(RoleEnum),
      default: RoleEnum.user,
    },
    provider: {
      type: String,
      enum: Object.values(ProviderEnum),
      default: ProviderEnum.SYSTEM,
    },
    changeCredentialTime: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema
  .virtual("username")
  .set(function (value: string) {
    const [firstName, lastName] = value.split(" ") || [];
    this.set({ firstName, lastName });
  })
  .get(function () {
    return this.firstName + " " + this.lastName;
  });

export const UserModel = models.User || model<IUser>("User", userSchema);
export type HUserDocument = HydratedDocument<IUser>;
