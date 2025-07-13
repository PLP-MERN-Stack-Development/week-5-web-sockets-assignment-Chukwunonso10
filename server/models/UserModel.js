const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
    userName: {type: String, required: true, unique: true},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    status: {type: String, enum: ["onLine", "offLine", "away"], default:"offLine"},
    lastSeen: {type: Date, default: Date.now},
    avatar: {type: String, default: "" }

}, {timestamps: true})

const User = mongoose.model("User", UserSchema);
module.exports = User;