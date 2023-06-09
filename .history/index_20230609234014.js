const express = require('express')
var jwt = require('jsonwebtoken');
require('dotenv').config()
const app = express()
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors')
const port = process.env.PORT || 5000


// midleware
app.use(cors())
app.use(express.json())

//verify valid user
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  console.log(authorization);
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];
  console.log(token);

  // jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
  //   if (err) {
  //     return res.status(401).send({ error: true, message: 'unauthorized access' })
  //   }
  //   req.decoded = decoded;
  //   next();
  // })
}


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
    const usersCollection = client.db("ToneTors").collection("user")
    //jwt token ganerate
    app.post('/jwt', (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.SECRET_KEY, { expiresIn: '1h' })

      res.send({ token })
    })




    // users related apis
    app.get('/users', verifyJWT, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });
    //user create
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
run().catch(error => console.error(error.message))

app.get('/', (req, res) => {
  res.send('hello tone')
})

app.listen(port, () => {
  console.log(`tone tuitors is running on ${port}`)
})