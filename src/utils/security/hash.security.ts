import {compare, hash,genSalt } from 'bcrypt'


export const generateHash = async (plaintext:string, saltRound:number=Number(process.env.SALT)): Promise<string>=>{
    const salt:string =await genSalt(saltRound)
    console.log(salt)
    return  await hash (plaintext,saltRound || salt );
}

export const compareHash = async (
    plaintext:string,
     hash:string
): Promise<boolean>=>{
    return  await compare (plaintext,hash );
}