const express = require('express')
var jwt = require('jsonwebtoken');
require('dotenv').config()
const app = express()
const cors = require('cors')
const port = process.env.PORT || 5000 



// midleware
app.use(cors())
app.use(express.json())
 
app.get('/', (req,res)=>{
    res.send('hello tone')
})

app.listen(port,()=>{
    console.log(`tone tuitors is running on ${port}`)
})