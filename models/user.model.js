import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
    fullname:{type:String},
    email:{type:String},
    password:{type:String},
    createdOn:{type:Date,default: new Date().getTime()},
})

const userModel = mongoose.model("User",userSchema);

export default userModel;