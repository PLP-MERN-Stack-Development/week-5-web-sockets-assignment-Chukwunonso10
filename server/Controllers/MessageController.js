const Message = require("../models/MessageModel")


const getAllMessages = async(req, res) =>{
try {
    const messages = await Message.find()
                                .populate("sender", "userName")
                                .populate("room", "roomName")
                                .populate("readBy.user", "userName")
                                .populate("reactions.reaction.user", "userName")
                                .sort({ createdAt: -1})    //sort by field
                                .limit(20);
    if (messages.length === 0) return res.status(404).json({ message: "No messages found!"})
    res.status(200).json({ message: "successfull", messages})
}
catch(error) {
    return res.status(500).json({ message: "Server error", error: error.message })
}
}

 module.exports = { getAllMessages }