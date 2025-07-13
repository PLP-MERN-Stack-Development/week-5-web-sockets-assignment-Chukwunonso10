const express = require('express')
const cors = require('cors')
const http = require('http')
const dotenv = require('dotenv')
const messageRoute = require('./Routes/MessageRoute')
const roomRoute = require('./Routes/RoomRoute')
const authRoute = require('./Routes/authRoute')
const connectDB = require('./config/db')
const { authenticate, socketAuth } = require('./middlewares/authenticate')


const app = express()
const server = http.createServer(app)
const { Server } = require('socket.io')
dotenv.config()
connectDB()


app.use(cors())
app.use(express.json())
app.use(express.urlencoded({
  extended: true
}))





const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  }
})



// Socket IO
require('./socket')(io);

app.use('/api/messages', messageRoute)
app.use('/api/rooms', roomRoute)
app.use('/api/auth', authRoute)



server.listen(process.env.PORT, ()=>{
  console.log(`server is running on port: ${process.env.PORT}`)
})