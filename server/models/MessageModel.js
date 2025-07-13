const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema({
    sender: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    content: {type: String, required: true},
    room: {type: mongoose.Schema.Types.ObjectId, ref:"Room"},
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    messageType: { type: String, enum: ["text", "file", "image"], default: "text" },
    fileUrl: { type: String },
    fileName: { type: String },
    readBy: [
        {user: {type:mongoose.Schema.Types.ObjectId, ref: "User"},
        readAt: {type: Date, default: Date.now}
    }
    ],
    reactions: [{
        reaction: {type: String, enum: ["love", "angry", "sad", "laugh", "like"], required:true},
        user: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
        createdAt: {type: Date, default: ()=> new Date() }
    }],

}, {timestamps: true})

const Message = mongoose.model("Message", messageSchema)
module.exports = Message