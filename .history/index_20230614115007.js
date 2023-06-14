const express = require('express')
var jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const cors = require('cors')
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000


// midleware
app.use(cors())
app.use(express.json())



//verify valid user
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
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
    const classesCollection = client.db("ToneTors").collection("classes")
    const instructorClassCollection = client.db("ToneTors").collection("instructorClass")
    const bookingsClassesCollection = client.db("ToneTors").collection("bookingsClasses")
    const paymentCollection = client.db("ToneTors").collection("payments");
    //jwt token ganerate
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET_KEY, { expiresIn: '20h' })
      res.send({ token })
    })


    //admin check 
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        return res.send({ admin: false })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);
    })

    //instructor check 
    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
       return res.send({ instructor: false })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.role === 'instructor' }
      res.send(result);
    })
    //make admin
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);

    })
    //make instructor
    app.patch('/users/instructor/:id',  async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);

    })
    // users 
    app.get('/users', verifyJWT , async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });
    //user create
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    //classes route

    //add a new class 
    app.get('/instructors/approvedClass',  async (req,res)=>{
      const query = {status: 'approved'};
      const result = await instructorClassCollection.find(query).toArray()
      res.send(result)
    })
    app.post('/instructor/class', async (req, res) => {
      const newClass = req.body;
      const result = await instructorClassCollection.insertOne(newClass)
      res.send(result)
    })
    app.get('/instructor/class', verifyJWT, async (req,res)=>{
      const result = await instructorClassCollection.find().toArray();
      res.send(result)
    })
    app.patch('/instructor/class/:id',  async (req,res) =>{
      const id = req.params.id;
      const newClass = req.body;
      const filter = { _id: new ObjectId(id)}
      const updateNewClass = {
        $set: newClass
      }
      const result = await instructorClassCollection.updateOne(filter,updateNewClass)
      res.send(result)
    })

    //get the new class of instructor
    app.get('/instructor/class/:email', async (req, res) => {
      const email = req.params.email
      const query = { email: email };
      const result = await instructorClassCollection.find(query).toArray()
      res.send(result);
    })

    app.get('/classes', async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    })

    app.post('/bookings/class',  async (req, res) => {
      const bookings = req.body;
      const query = {  $and: [
        { instructor_name: bookings.instructor_name },
        { email: bookings.email }
      ] }
      const existingBookings = await bookingsClassesCollection.findOne(query);
      if (!existingBookings) {
        const result = await bookingsClassesCollection.insertOne(bookings);
        res.send(result);
      }
      else {
        return res.send({ message: 'You have already added this class' })
      }
    })
    app.get('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const booking = await bookingsClassesCollection.findOne(query);
      res.send(booking);
    })
    app.get('/selected/:email',  async (req, res) => {
      const email = req.params.email
      const query = {email: email }
      const result = await bookingsClassesCollection.find(query).toArray()
      res.send(result)
    })
    app.delete('/selected/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await bookingsClassesCollection.deleteOne(query)
      res.send(result)
    })
    //payment 
    // create payment intent
    app.get('/payments/:email', async (req, res) => {
      const email = req.params.email
      const query = { email: email }
      const result = await paymentCollection.find(query).sort({ date: -1 }).toArray();
      res.send(result)
    })
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })


    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const { courseId, classesId } = payment
      const insertResult = await paymentCollection.insertOne(payment);
      const ClassQuery = { _id: new ObjectId(classesId) }
      const classDoc = await classesCollection.findOne(ClassQuery);
      console.log(classDoc);
      const updatedSeats = classDoc.available_seats - 1;
      const updateEnroll = classDoc.enrolled + 1;
      await classesCollection.updateOne(
        { _id: new ObjectId(classesId) },
        {
          $set: {
            available_seats: updatedSeats,
            enrolled: updateEnroll
          }
        }
      );
      const query = { _id: new ObjectId(courseId) }
      const deleteResult = await bookingsClassesCollection.deleteOne(query)
      res.send({ insertResult, deleteResult });
    })
  }
  finally {

  }
}
run().catch(error => console.error(error.message))

app.get('/', (req, res) => {
  res.send('hello tone')
})

app.listen(port, () => {
  console.log(`tone tuitors is running on ${port}`)
})