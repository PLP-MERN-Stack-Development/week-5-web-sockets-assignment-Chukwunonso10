const mongoose = require('mongoose')

const roomSchema = new mongoose.Schema({
    roomName: {type:String, required: true},
    description: {type: String, default: ""},
    members: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    createdBy: {type:  mongoose.Schema.Types.ObjectId, ref: "User"}
}, {timestamps: true})

const Room = mongoose.model("Room", roomSchema)
module.exports = Room