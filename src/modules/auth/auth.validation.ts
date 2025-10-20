import {z} from 'zod'
import {generlaFields} from '../../middleware/validation.middleware'

export const login={

body:z.strictObject({
    email:generlaFields.email,
    password:generlaFields.password,
})
}
//=====================================================
export const signup={

body:login.body.extend({
   username: generlaFields.username,
      email: generlaFields.email,
      password: generlaFields.password,
      confirmPassword: generlaFields.confirmPassword,
      gender: generlaFields.gender,   // ⬅️ أضفناها هنا
})
.superRefine((data,ctx)=>{
    console.log(data, ctx)
  // return data.confirmPassword===data.password;
  if(data.confirmPassword!== data.password){
ctx.addIssue({
    code:"custom",
    path:["confirmEmail"],
    message:"password mismatch confirmpasword"
  })
  }
}),
}
//======================================================
export const confirmEmail = {
  body: z.strictObject({
    email: generlaFields.email,
    otp: generlaFields.otp,
  }),
};

//=============================================
export const signupWithGmail={

body:z.strictObject({
  idToken:z.string()
}),
};

//=======================
export const sendForgotPasswordCode={

body:z.strictObject({
  email:generlaFields.email,
}),
};

//=======================
export const verifyForgotPassword={

body:sendForgotPasswordCode.body.extend({
  otp:generlaFields.otp,
}),
};
//===================
export const resetForgotPassword={

body:verifyForgotPassword.body
  .extend({
  otp:generlaFields.otp,
  password:generlaFields.password,
  confirmPassword:generlaFields.confirmPassword,
})
  .refine((data) =>{
    return data.password === data.confirmPassword;
  } ,{message:"password mismatch confirm-password", path:['confirmPassword']}),
};
