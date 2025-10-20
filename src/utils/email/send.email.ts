import {createTransport, type Transporter} from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import Mail from 'nodemailer/lib/mailer';
import { BadRequestException } from '../response/error.response';

export const sendEmail = async (data:Mail.Options):Promise<void>=>{
    if (!data.html && !data.attachments?.length && !data.text){
        throw new BadRequestException("Missing email content")
    }
    const transporter:Transporter<
     SMTPTransport.SentMessageInfo,
     SMTPTransport.Options
     >=createTransport({
       service:"gmail",
        auth:{
            user:process.env.EMAIL as string,
            pass:process.env.EMAIL_PASSWORD as string,
        },
        });

        const info = await transporter.sendMail({
            ...data,
            from:`"Route ${process.env.APPLICATION_NAME}" <${process.env.EMAIL as string}>`,

        });
        console.log("Message sent:", info.messageId);
    };
