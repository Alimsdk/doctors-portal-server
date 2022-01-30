const express=require('express');
const app=express();
const cors=require('cors');
require('dotenv').config();
const { MongoClient } = require('mongodb');
const ObjectId=require('mongodb').ObjectId;
const port=process.env.local || 5000
var admin = require("firebase-admin");


var serviceAccount = require("./doctors-portal-63609-firebase-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function verifyToken(req,res,next){
   if(req.headers.authorization.startsWith('Bearer ')){
          const token=req.headers.authorization.split(' ')[1];
       
          try{
              const decodedUser=await admin.auth().verifyIdToken(token);
            req.decodedEmail=decodedUser.email;
          }catch{

          }
    }
    next();
}

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ofdnr.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run(){
      try{
           await client.connect();
       
           const database=client.db('doctors_portal');
           const appointmentCollection=database.collection('appointment');
           const usersCollection=database.collection('users');

        app.get('/appointments',async(req,res)=>{
       
            const email=req.query.email;
            const date=new Date(req.query.date).toLocaleDateString();
            console.log(date)
            const query={patientEmail:email,date:date}
           console.log(query);
            const cursor=appointmentCollection.find(query);
         
            const appointments=await cursor.toArray();
            res.json(appointments)
        })

        app.get('/appointments/:id',async(req,res)=>{
            const id=req.params.id;
            const query={_id:ObjectId(id)}
            const result=await appointmentCollection.findOne(query);
            res.send(result)
        })

       app.post('/appointments',async(req,res)=>{
           const appointment=req.body;
           const result=await appointmentCollection.insertOne(appointment);
           console.log(result);
           res.json(result)
       })

      app.post('/users',async(req,res)=>{
          const userData=req.body;
          const result=await usersCollection.insertOne(userData);
          console.log(result);
          res.json(result);
      })

      app.put('/users',async(req,res)=>{
          const userData=req.body;
          console.log(userData);
          const filter = { email: userData.email };
          const options = { upsert: true };
          const updateDoc = {
            $set: userData
          };
          const result = await usersCollection.updateOne(filter,updateDoc,options);
          res.json(result);
      })

      app.put('/users/admin', verifyToken, async(req,res)=>{
          const user=req.body;
        const requestedEmail=req.decodedEmail;
        if(requestedEmail){
            const requestedUser=await usersCollection.findOne({email:requestedEmail})
            if(requestedUser.role==='admin'){
                const filter={email:user.email}
          const updateDoc={
              $set:{role:'admin'}
          }
          const result=await usersCollection.updateOne(filter,updateDoc);
          res.json(result);
            }
        }else{
            res.status(403).json({massage:'no access'})
        }
         
      })

    app.get('/users/:email',async(req,res)=>{
        const email=req.params.email;
        const query={email:email}
        const user=await usersCollection.findOne(query);
        console.log(user);
        let isAdmin=false;
        if(user?.role==='admin'){
            isAdmin=true;
        }
        res.json({admin:isAdmin})
    })
     
      }finally{

      }
}
run().catch(console.dir);

app.get('/',(req,res)=>{
    res.send('hello from doctors portal server');
})

app.listen(port,()=>{
    console.log('listening to port',port);
})