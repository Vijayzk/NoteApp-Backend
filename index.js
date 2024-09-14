import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken'
import {authenticateToken} from './utilities.js'
import userModel from './models/user.model.js'
import noteModel from './models/note.model.js'

dotenv.config()
const app = express();
const port = process.env.PORT 
const DATABASE_URL = process.env.DATABASE_URL

mongoose.connect(process.env.DATABASE_URL)

app.use(express.json())

app.use(
    cors({
        origin:'*',
    })
)

app.get('/',(req,res)=>{
    res.json({data:"Hello"});
})

//Create Account
app.post('/create-account', async(req,res)=>{
   
    const {fullname,email,password} = req.body;

    if(!fullname){
        return res.status(400).json({error:true , message:"Full name is required"});
    }

    if(!email){
        return res.status(400).json({error:true , message:"Email is required"});
    }

    if(!password){
        return res.status.json({error:true , message:"Password is required"});
    }

    const isUser = await userModel.findOne({email:email});

    if(isUser){
        return res.json({
            error:true,
            message:"User already exist"
        })
    }

    const user = new userModel({
        fullname,
        email,
        password
    })

    await user.save();

    const accessToken = jwt.sign({user} , process.env.ACCESS_TOKEN_SECRET,{
        expiresIn:"36000m"
    });

    return res.json({
        error:false,
        user,
        accessToken,
        message:"Registration Successfull"
    });

});

//Login 
app.post('/login',async(req,res)=>{
    const {email,password} = req.body;

    if(!email){
        return res.status(400).json({error:true , message:"Email is required"});
    }

    if(!password){
        return res.status.json({error:true , message:"Password is required"});
    }

    const userInfo = await userModel.findOne({email:email})
    
    if(!userInfo){
        return res.json({
            error:true,
            message:"User does not exist."
        })
    }

    if(userInfo.email == email && userInfo.password == password){
        const user = {user:userInfo}
        const accessToken = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{
            expiresIn:'36000m'
        })

        return res.json({
            error:false,
            message:"Login Successfull",
            email,
            accessToken
        })
    }
    else{
        return res.status(400).json({
            error:true,
            message:"Invalid Credentials"
        })
    }

})

//Add Note
app.post('/add-note', authenticateToken ,async(req,res) =>{
   
    const {title,content,tags} = req.body;
    const {user} = req.user;

    if(!title){
        return res.status(400).json({error:true,message:"Title required."})
    }

    if(!content){
        return res.status(400).json({error:true,message:"Content required."})
    }

    try{
        const note = new noteModel({
            title,
            content,
            tags:tags || [],
            userId:user._id
        })

        await note.save();

        return res.json({
            error:false,
            note,
            message:"Note added successfully"
        })
    }
    catch(error){
        return res.status(500).json({
            error:true,
            message:"Internal server error"
        })
    }
});

//Edit Note
app.put('/edit-note/:noteId', authenticateToken ,async(req,res) =>{
  
    const noteId = req.params.noteId;
    const {title , content , tags , isPinned } = req.body;
    const {user} = req.user;


    if(!title && !content && !tags){
        return res.status(400).json({error:true,message:"No changes provided"})
    }

    try{
        const note = await noteModel.findOne({_id:noteId,userId:user._id});

        if(!note){
            return res.status(404).json({error:true , message:"Note not found"});
        }

        if(title) note.title = title
        if(content) note.content = content
        if(tags) note.tags = tags
        if(isPinned) note.isPinned = isPinned
        
        await note.save()

        return res.json({
            error:false,
            note,
            message:"Note updated successfully"
        })
    }
    catch(error){
        res.status(500).json({
            error:true,
            message:'Internal Server Error'
        })
    }
})


//Get All Notes
app.get('/get-all-note' , authenticateToken , async(req,res) => {
    const { user } = req.user;

    try{
       const notes = await noteModel.find({userId:user._id}).sort({isPinned:-1});

       return res.json({
        error:false,
        notes,
        message:"All notes retrived successfully"
       })
    }
    catch(error){
         return res.status(500).json({
            error:false,
            message:"Internal Error Occur"
         })
    }
})

//Delete Note
app.delete('/delete-note/:noteId', authenticateToken ,async(req,res) =>{
   
    const noteId = req.params.noteId
    const {user} = req.user

    try{
        const note = await noteModel.findOne({_id:noteId , userId:user._id});

        if(!note){
            return res.status(404).json({error:true , message:"Note not found"})
        }

        await noteModel.deleteOne({_id:noteId , userId:user._id})

        return res.json({
            error:false,
            message:"Note deleted successfully"
        })
    }
    catch(error){
        return res.status(500).json({
            error:false,
            message:"Internal Error Occur"
         })
    }
})

//Update isPinned value
app.put('/update-note-pinned/:noteId', authenticateToken ,async(req,res) =>{
    const noteId = req.params.noteId;
    const {isPinned } = req.body;
    const {user} = req.user;
    


    try{
        const note = await noteModel.findOne({_id:noteId,userId:user._id});

        if(!note){
            return res.status(404).json({error:true , message:"Note not found"});
        }

        note.isPinned = isPinned
        
        await note.save()

        return res.json({
            error:false,
            note,
            message:"Note updated successfully"
        })
    }
    catch(error){
        res.status(500).json({
            error:true,
            message:'Internal Server Error'
        })
    }
})

//Get Users
app.get('/get-user', authenticateToken ,async(req,res)=>{
  
    const {user} = req.user;

    const isUser = await userModel.findOne({_id:user._id});

    if(!isUser){
        return res.sendStatus(401)
    }

    return res.json({
        user:{
            fullname:isUser.fullname, 
            email:isUser.email,
            _id:isUser._id,
            createdOn:isUser.createdOn
        },
        message:""
    })
})

//Search Notes
app.get('/search-notes',authenticateToken,async(req,res) => {
    const{user} = req.user;
    const{query} = req.query;

    if(!query){
        return res.status(400).json({error:true , message:"Search query is required"});
    }

    try{
        const matchingNotes = await noteModel.find({
        userId:user._id,
        $or:[
            {title:{$regex: new RegExp(query,'i')}},
            {content:{$regex: new RegExp(query,'i')}},
        ],
       });

       return res.json({
        error:false,
        notes:matchingNotes,
        message:"Notes matching the search query retrived successfully"
       })
    }
    catch(error){
        res.status(500).json({
            error:true,
            message:'Internal Server Error'
        });
    }
})

app.listen(port,()=>{
    console.log(`Server listening at http://localhost:${port}`)
})
