import { EventEmitter } from "node:events";
import Mail from "nodemailer/lib/mailer";
import {sendEmail} from "../email/send.email";
import { verifyEmail } from "../email/verify.template.email";
export const emailEvent = new EventEmitter();

interface IEmail extends Mail.Options{
    otp:number;
}
emailEvent.on("confirmEmail", async (data: IEmail)=>{
    try{
        data.subject="confirm-Email";
        data.html=verifyEmail({otp:data.otp, title:"Email Confirmation"});
        await sendEmail(data);
    }   catch (error){
        console.log(`Fail to send email`, error);
    }
});

emailEvent.on("resetPassword", async (data: IEmail)=>{
    try{
        data.subject="Reset-Account-Password";
        data.html=verifyEmail({otp:data.otp, title:"Reset code"});
        await sendEmail(data);
    }   catch (error){
        console.log(`Fail to send email`, error);
    }
});