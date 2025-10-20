import {EventEmitter} from "node:events";
import { deleteFile, getFile } from "./s3.config";
import { UserRepository } from "../../DB/repositry/user.repository";
import { UserModel } from "../../DB/model/User.model";
export const s3Event = new EventEmitter({});

s3Event.on("trackprofileImageUpload", (data)=>{
console.log({data})


setTimeout(async() => {
    const userModel = new UserRepository(UserModel)
    try {
        await getFile({key: data.key});
        await  userModel.updateOne({
            filter: {_id: data.userId},
            update:{
                $unset:{ temProfileImage:1},
            },
        })
        await deleteFile({key: data.oldKey})
        console.log(`Doneee `)
    } catch (error: any) {
      console.log(error)  
      if (error.Code === "NoSuchKey") {
        await  userModel.updateOne({
            filter: {_id: data.userId},
            update:{
                  profileImage: data.oldKey,
                $unset:{ temProfileImage:1},
            },
        })
      }
    }

}, data.expiresIn ||Number(process.env.AWS_PRE_SIGNED_URL_EXPIRES_IN_SECONDS)*1000);
}
)