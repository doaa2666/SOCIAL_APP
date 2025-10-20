import {connect } from 'mongoose'
import { UserModel } from '../DB/model/User.model';

const connectDB = async ():Promise<void> =>{

    try {
      const result =await connect(process.env.DB_URI as string,{

        serverSelectionTimeoutMS:30000,
      })

await UserModel.syncIndexes,

      console.log(result.models);
      console.log("DB connected successfully")
    } catch (error) {
      console.log("DB FAIL CONNECT")  
    }
}
export default connectDB;