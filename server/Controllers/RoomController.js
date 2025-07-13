const Room = require('../models/RoomModel')

const getAllRooms = async (req, res) => {
   try {
     const rooms = await Room.find()
                                .populate("members", "userName")
                                .populate("createdBy", "userName")
                                .sort({ createdAt: -1})
    if (rooms.length === 0)return res.status(404).json({ message: "No room found"})
    res.status(200).json({ message: "sucess", rooms})
   } catch (error) {
    res.status(500).json({ message: "Server Error", error})
   }
}

const createRooms = async (req, res) =>{
    const { roomName, description } = req.body
    if (!roomName || !description) return res.status(400).json({ message: "All fields are required"})
    const room = await Room.findOne({ roomName})
    if (room) return res.status(404).json({ message: "Rooms already exists!"})
   
    
    const newRoom = new Room({
                    roomName: roomName,
                    description: description
})
    await newRoom.save()
    res.status(201).json({ message: "New Room Created !"})
}

module.exports = {
    getAllRooms,
    createRooms
}