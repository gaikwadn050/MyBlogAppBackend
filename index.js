const express = require('express');
const cors =require('cors')
const app = express()
const mongoose =require('mongoose')
const User = require('./models/User')
const Post = require('./models/Post');
var cookieParser = require('cookie-parser')
const bcrypt = require('bcrypt');
const multer  = require('multer')
const uploadMiddleware = multer({ dest: 'uploads/' });
const fs = require('fs');
const BASE_URL = process.env.BASE_URL
const PORT = process.env.PORT || 5555


const salt = bcrypt.genSaltSync(10);
var jwt = require('jsonwebtoken');
const secret = 'qadfgthrgnrjjjrtr12';

app.use(cors({
    "origin": `${BASE_URL}`,
    "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
    "preflightContinue": false,
    "optionsSuccessStatus": 204,
    "credentials" : true,
  }
  ))
  app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'))

//mongodb connection
  mongoose.connect(
    'mongodb+srv://blog:blog123@cluster0.siopql4.mongodb.net/?retryWrites=true&w=majority',
    (err) => {
     if(err) console.log(err) 
     else console.log("mongdb is connected");
    }
  ).then(()=>console.log('connected'))
  .catch(e=>console.log(e, 'mongo error ok'));



//Registration Page
app.post('/register', async (req,res) =>{
    const {username,password} = req.body;
    try{
const userDocs = await User.create({
    username,
    password:bcrypt.hashSync(password,salt),
});
//await userDocs.save()
res.json(userDocs);
    //console.log(userDocs, "ok.....");
    } catch(e ) {
        res.status(400).json(e)
    }
});

//Login Page
app.post('/login', async (req,res) =>{
    const {username,password} = req.body;
const userDoc = await User.findOne({username});
const passOk = bcrypt.compareSync(password, userDoc.password);
if(passOk){
//logged in
jwt.sign({username,id:userDoc._id},secret,{},(err,token) => {
    if(err) throw err ;
    res.cookie('token', token ).json({
        id:userDoc._id,
        username,})
})
}else {
    res.status(400).json('wrong credentials')
}
})

//Profile
app.get('/profile',(req,res) => {
    const {token} = req.cookies;
    jwt.verify(token, secret, {}, (err, info) => {
        if (err) throw err ;
        res.json(info)
    });
});

// app.get('/profile', (req, res) => {
//     const { token } = req.cookies;
//     jwt.verify(token, secret, {}, (err, info) => {
//       if (err) {
//         res.status(401).json({ error: 'Unauthorized' });
//       } else {
//         res.json(info);
//       }
//     });
//   });


  app.post('/logout', ( req,res) => {
    res.cookie('token','').json('ok');
  })

  app.post('/post',uploadMiddleware.single('file'), async (req, res) => {
const {originalname,path} = req.file;
const parts = originalname.split('.')
const ext  = parts[parts.length - 1];
const newPath = path+'-'+ext;
fs.renameSync(path, newPath)
const {token} = req.cookies;
  jwt.verify(token, secret, {}, async(err, info) => {
      if (err) throw err ;
const {title,summary,content} = req.body;
const postDoc = await Post.create({
  title,
  summary,
  content,
  cover:newPath,
  author: info.id,
});
res.json({postDoc});
  });


  });

  app.put('/post',uploadMiddleware.single('file'), async (req,res) => {
    let newPath = null;
    if (req.file) {
      const {originalname,path} = req.file;
      const parts = originalname.split('.');
      const ext = parts[parts.length - 1];
      newPath = path+'.'+ext;
      fs.renameSync(path, newPath);
    }
  
    const {token} = req.cookies;
    jwt.verify(token, secret, {}, async (err,info) => {
      if (err) throw err;
      const {id,title,summary,content} = req.body;
      const postDoc = await Post.findById(id);
      const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
      if (!isAuthor) {
        return res.status(400).json('you are not the author');
      }
      await postDoc.update({
        title,
        summary,
        content,
        cover: newPath ? newPath : postDoc.cover,
      });
  
      res.json(postDoc);
    });
  
  });


  app.get('/post', async (req,res) => {
res.json(
  await Post.find()
  .populate('author', ['username'])
.sort({createdAt: -1})
.limit(20)
)
  });

  app.get('/post/:id', async (req, res) => {
    const {id} = req.params;
    const postDoc = await Post.findById(id).populate('author', ['username']);
    res.json(postDoc);
  })

  

app.listen(PORT,console.log(`server started ${PORT}`))
//mongodb+srv://blog:Trust@9012033@cluster0.siopql4.mongodb.net/?retryWrites=true&w=majority
//Trust@9012033