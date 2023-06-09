const express = require('express')
var jwt = require('jsonwebtoken');
require('dotenv').config()
const app = express()
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors')
const port = process.env.PORT || 5000 


//user: User05
//password: Itb92FuCAFinxihQ
// midleware
app.use(cors())
app.use(express.json())
 

const uri = `mongodb+srv://${process.env.BD_USER}:${process.env.BD_PASSWORD}@cluster0.no0vwww.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const usersCollection=client.db("ToneTors").collection("user")


    app.post('/users', async (req, res) => {
      const user = req.body;
      console.log(user);
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
  } finally {
 
  }
}
run().catch(error=>console.error(error.message))

app.get('/', (req,res)=>{
    res.send('hello tone')
})

app.listen(port,()=>{
    console.log(`tone tuitors is running on ${port}`)
})