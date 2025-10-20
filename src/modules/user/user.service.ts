import { Request, Response } from "express";
import { IFreezeAccountDTO, IHardDeleteAccountDTO, ILogoutDto, IRestoreAccountDTO } from "./user.dto";
import {
  createLoginCredentials,
  createRevokeToken,
  LogoutEnum,
} from "../../utils/security/token.security";
import { UpdateQuery } from "mongoose";
import { HUserDocument, IUser, RoleEnum, UserModel } from "../../DB/model/User.model";
import { UserRepository } from "../../DB/repositry/user.repository";
import { JwtPayload } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createPreSignedUploadLink  , deleteFiles, deleteFolderByPrefix, uploadFiles } from "../../utils/multer/s3.config";
import { Types } from "mongoose";
import { BadRequestException, NotfoundException, UnauthorizedException } from "../../utils/response/error.response";
import { s3Event } from "../../utils/multer/s3.events";
import { successResponse } from "../../utils/response/success.response";
import { IProfileImageResponse, IUserResponse } from "./user.entities";

class UserService {
  private userModel = new UserRepository(UserModel);
  constructor() {}
  //==================PROFILE IMAGE===============
   profileImage = async (req: Request, res: Response): Promise<Response> => {
   // const key = await uploadLargeFile({
    //  file: req.file as Express.Multer.File,
  //    path: `users/${req.decoded?._id}/`,
  //  })
  //  return res.json({
   //   message: "Done",
    //  data: {
   //     file:key,
    //  },
   // });
   const {
    ContentType ,
    Originalname ,

   }: {ContentType:string, Originalname:string} = req.body;

   const {url , key }= await createPreSignedUploadLink ({
    ContentType, 
    Originalname,
    path:`users/${req.decoded?._id}/`,
   })
   const user = await this.userModel.findByIdAndUpdate({
    id:req.user?._id as  Types.ObjectId,
    update:{
      profileImage: key,
      temProfileImage:req.user?.profileImage,
    },
   });
if (!user) {
  throw new BadRequestException("fail to update profile image");
  
}
s3Event.emit("trackprofileImageUpload",{
  userId: req.user?._id,
   oldKey: req.user?.profileImage,
    key,
    expiresIn:30000,
    
  })
   return successResponse<IProfileImageResponse>({res, data:{ url}})
   

  };
  //=====================================
profileCoverImage = async (
      req: Request,
       res: Response
      ): Promise<Response> => {
        console.log("FILES ===>", req.files);
    const urls = await uploadFiles({
      files: req.files as Express.Multer.File[],
      path: `users/${req.decoded?._id}/cover`,
      useLarge:true,
    })
    const user = await this.userModel.findByIdAndUpdate({
      id: req.user?._id as Types.ObjectId,
      update:{
        coverImages:urls,
      }
    })
    if (!user) {
      throw new BadRequestException("Fail to update to cover images");
      
    }
    if (req.user?.coverImages) {
      await deleteFiles({urls:req.user.coverImages})
    }
     return successResponse<IUserResponse>({res, data:{ user}})
  };
  // ================== PROFILE ==================
profile = async (req: Request, res: Response): Promise<Response> => {
    if (!req.user) {
      throw new UnauthorizedException("missing user details");
      
      
    }
  return successResponse<IUserResponse>({res, data:{ user:req.user}})

  };
//====================freeze account=============
freezeAccount = async(req: Request, res: Response): Promise<Response>=>{
const {userId}= (req.params as IFreezeAccountDTO)|| {};
if (userId && req.user?.role !== RoleEnum.admin) {
  
throw new BadRequestException("not authorized user ");

}
const user = await this.userModel.updateOne({
  filter:{
  _id:userId || req.user?._id,
  freezedAt: { $exists: false},
  },
  update:{
    freezedAt: new Date(),
    freezedBy: req.user?._id,
    changeCredentialTime: new Date(),
    $unset:{
      restoredAt:1,
      restoredBy:1,
    }
  }
})
if (!user.matchedCount) {
  throw new NotfoundException("user not found or fail to delete this resource ")
}
  return successResponse({res})

}
//=================restore account===============
restoreAccount =async(req: Request, res: Response): Promise<Response>=>{
const {userId}= req.params as IRestoreAccountDTO;

const user = await this.userModel.updateOne({
  filter:{
  _id:userId ,
 freezedBy: { $ne: userId},
  },
  update:{
    restoredAt: new Date(),
    restoredBy: req.user?._id,
    $unset:{
      freezedAt:1,
      freezedBy:1,
    }
  }
})
if (!user.matchedCount) {
  throw new NotfoundException("user not found or fail to restore this resource ")
}
   return successResponse({res})

}
//====================hard delete===============
hardDeleteAccount =async(req: Request, res: Response): Promise<Response>=>{
const {userId}= req.params as IHardDeleteAccountDTO;

const user = await this.userModel.deleteOne({
  filter:{
  _id:userId ,
 freezedAt: { $exists:true },
  },
 
});
if (!user.deletedCount) {
  throw new NotfoundException("user not found or fail to hard delete this resource ")
}
await deleteFolderByPrefix({path: `users/${userId} `})

 return successResponse({res})

}
  // ================== LOGOUT ==================
  logout = async (req: Request, res: Response): Promise<Response> => {
    const { flag }: ILogoutDto = req.body;
    let statusCode: number = 200;
    const update: UpdateQuery<IUser> = {};

    switch (flag) {
      case LogoutEnum.all:
        update.changeCredentialTime = new Date();
        break;
      default:
        await createRevokeToken(req.decoded as JwtPayload);
        statusCode = 201;
        break;
    }

    await this.userModel.updateOne({
      filter: { _id: String(req.decoded?._id) },
      update,
    });

    return res.status(statusCode).json({ message: "Done" });
  };

  // ================== REFRESH TOKEN ==================
  refreshToken = async (req: Request, res: Response): Promise<Response> => {
    const credentials = await createLoginCredentials(req.user as HUserDocument);
    await createRevokeToken(req.decoded as JwtPayload);
    return res.status(201).json({ message: "Done", data: { credentials } });
  };

  // ================== UPDATE BASIC INFO ==================
  updateBasicInfo = async (req: Request, res: Response): Promise<Response> => {
    const { userName, age, phone, bio } = req.body;

    const updatedUser = await this.userModel.updateOne({
      filter: { _id: String(req.user?._id) },
      update: { userName, age, phone, bio },
    });

    return res.status(200).json({
      message: "Basic info updated successfully",
      data: updatedUser,
    });
  };

  // ================== UPDATE PASSWORD ==================
  updatePassword = async (req: Request, res: Response): Promise<Response> => {
    const { oldPassword, newPassword } = req.body;

    const user = await this.userModel.findOne({
      filter: { _id: String(req.user?._id) },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, (user as any).password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userModel.updateOne({
      filter: { _id: String((user as any)._id) },
      update: { password: hashedPassword, changeCredentialTime: new Date() },
    });

    return res.status(200).json({ message: "Password updated successfully" });
  };

  // ================== UPDATE EMAIL ==================
  updateEmail = async (req: Request, res: Response): Promise<Response> => {
    const { newEmail, otp } = req.body;

  
    const isValidOtp = otp === "123456";
    if (!isValidOtp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const updatedUser = await this.userModel.updateOne({
      filter: { _id: String(req.user?._id) },
      update: { email: newEmail },
    });

    return res
      .status(200)
      .json({ message: "Email updated successfully", data: updatedUser });
  };

  // ================== GET PROFILE ==================
  getProfile = async (req: Request, res: Response): Promise<Response> => {
    const idParam = req.params.id || undefined;
    const userId = idParam || String(req.user?._id);

    const user = await this.userModel.findOne({ filter: { _id: userId } });
    if (!user) return res.status(404).json({ message: "User not found" });

    return res
      .status(200)
      .json({ message: "Profile retrieved successfully", data: user });
  };

  // ================== SHARE PROFILE ==================
  shareProfile = async (req: Request, res: Response): Promise<Response> => {
    const idParam = req.params.id || undefined;
    const userId = idParam || String(req.user?._id);

    const user = await this.userModel.findOne({ filter: { _id: userId } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const publicData = {
      userName: (user as any).userName,
      bio: (user as any).bio,
      age: (user as any).age,
      gender: (user as any).gender,
    };

    return res
      .status(200)
      .json({ message: "Public profile retrieved", data: publicData });
  };
}

export default new UserService();
