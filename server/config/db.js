const mongoose = require('mongoose')

const connectDB = ()=>{
    mongoose.connect(process.env.MONGO_URI) 
    .then(()=> console.log(`Database connect successfully`))
    .catch((err)=> {
        console.error('Connection Error', err) 
        process.exit()
    })
}



module.exports = connectDB;