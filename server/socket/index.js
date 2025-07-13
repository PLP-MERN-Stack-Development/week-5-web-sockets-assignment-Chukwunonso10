const Message = require('../models/MessageModel')
const Room = require('../models/RoomModel')
const User = require('../models/UserModel')

//list of active users- an in-memory like data structure
const ActiveUsers = new Map()
const userRooms = new Map()
const typingusers = new Map()

const handleConnection = (io)=> {
    io.on("connection", (socket)=> {
        console.log(`User ${socket.userName} connected: , ${socket.id}`)

        ActiveUsers.set(socket.userId, {    //add user to list of Active users
            socketId: socket.id,
            userName: socket.userName,
            status: "onLine",
            lastSeen: new Date()  //since we are not dealing with database schema
        })

        socket.on("joinRoom", async ({userName, roomId})=> {
            const user = await User.findOneAndUpdate({ userName }, {
                socketId: socket.id,
                userName: userName,
                status: "onLine",
                lastSeen: new Date(),
            }, { new: true })

            socket.join(roomId)
            io.to(roomId).emit("userjoined", { userName, roomId })

            // Send current online users to newly connected user
            socket.emit("onlineUsers", Array.from(ActiveUsers.values()))

            // Load recent messages for the room from MongoDB
            const messages = await Message.find({ room: roomId })
                .populate("sender", "userName avatar")
                .populate("readBy.user", "userName")
                .sort({ createdAt: -1 })
                .limit(50)

            socket.emit("roomMessages", messages.reverse())

            // typing
            socket.on("typing", ()=> {
                socket.to(roomId).emit("typing", { userName: userName })
            })

            socket.on("stopTyping", ()=> {
                socket.to(roomId).emit("stopTyping", { userName: userName })
            })

            socket.on("sendMessage", async (data)=>{
                if (!user) console.log(" user not found while sending a message")

                const message = new Message({
                    content: data.content,
                    sender: socket.userId,
                    room: data.roomId || null,
                    messageType: data.messageType || "text",
                    readBy: [{ user: socket.userId }],

                })

                await message.save() // Persist message to MongoDB
                await message.populate("sender", "username avatar")

                
                const messageData = {
                    id: message._id,
                    content: message.content,
                    sender: message.sender,
                    room: message.room,
                     recipient: message.recipient,
                    messageType: message.messageType,
                    fileUrl: message.fileUrl,
                    fileName: message.fileName,
                    readBy: message.readBy,
                    reactions: message.reactions,
                    createdAt: message.createdAt,
                }

                // Send to room or private chat
                if (data.roomId) {
                    socket.to(data.roomId).emit("newMessage", messageData)

                    // Send notification to room members
                    socket.to(data.roomId).emit("notification", {
                    type: "message",
                    message: `New message in room`,
                    sender: socket.userName,
                    })
                } else if (data.recipientId) {
                    const recipient = ActiveUsers.get(data.recipientId)
                    if (recipient) {
                    io.to(recipient.socketId).emit("newMessage", messageData)
                    io.to(recipient.socketId).emit("notification", {
                        type: "private_message",
                        message: `New message from ${socket.userName}`,
                        sender: socket.userName,
                    })
                    }
                }

                     // Send acknowledgment back to sender
                    socket.emit("messageDelivered", { messageId: message._id })

                         // Handle typing indicators using typingUsers map
                    socket.on("typing", (data) => {
                        const typingKey = `${data.roomId || data.recipientId}`

                        if (!typingusers.has(typingKey)) {
                        typingusers.set(typingKey, new Set())
                        }

                        typingusers.get(typingKey).add(socket.userId)

                        if (data.roomId) {
                        socket.to(data.roomId).emit("userTyping", {
                            userId: socket.userId,
                            username: socket.username,
                            roomId: data.roomId,
                        })
                        } else if (data.recipientId) {
                        const recipient = ActiveUsers.get(data.recipientId)
                        if (recipient) {
                            io.to(recipient.socketId).emit("userTyping", {
                            userId: socket.userId,
                            username: socket.username,
                            })
                        }
                        }
                    })
                    
                        socket.on("stopTyping", (data) => {
                        const typingKey = `${data.roomId || data.recipientId}`

                        if (typingusers.has(typingKey)) {
                            typingusers.get(typingKey).delete(socket.userId)
                        }

                        if (data.roomId) {
                        socket.to(data.roomId).emit("userStoppedTyping", {
                            userId: socket.userId,
                            roomId: data.roomId,
                        })
                        } else if (data.recipientId) {
                        const recipient = ActiveUsers.get(data.recipientId)
                        if (recipient) {
                            io.to(recipient.socketId).emit("userStoppedTyping", {
                            userId: socket.userId,
                            })  
                        }
                        }
                    })
//-------------------------------------------------------------------------------------
                        // Handle message read receipts (updates MongoDB)
                        socket.on("markAsRead", async (data) => {
                            try {
                            await Message.findByIdAndUpdate(data.messageId, {
                                $addToSet: { readBy: { user: socket.userId } },
                            })

                            if (data.roomId) {
                                socket.to(data.roomId).emit("messageRead", {
                                messageId: data.messageId,
                                userId: socket.userId,
                                roomId: data.roomId,
                                })
                            } else if (data.recipientId) {
                                const recipient = ActiveUsers.get(data.recipientId)
                                if (recipient) {
                                io.to(recipient.socketId).emit("messageRead", {
                                    messageId: data.messageId,
                                    userId: socket.userId,
                                })
                                }
                            }
                            } catch (error) {
                            socket.emit("error", { message: "Failed to mark message as read" })
                            }
                        })

                        // Handle message reactions (updates MongoDB)
                        socket.on("addReaction", async (data) => {
                            try {
                            const message = await Message.findById(data.messageId)

                            // Remove existing reaction from this user
                            message.reactions = message.reactions.filter((r) => r.user.toString() !== socket.userId)

                            // Add new reaction
                            message.reactions.push({
                                user: socket.userId,
                                reaction: data.reaction,
                            })

                            await message.save()

                            const reactionData = {
                                messageId: data.messageId,
                                userId: socket.userId,
                                username: socket.username,
                                reaction: data.reaction,
                            }

                            if (data.roomId) {
                                socket.to(data.roomId).emit("reactionAdded", reactionData)
                            } else if (data.recipientId) {
                                const recipient = ActiveUsers.get(data.recipientId)
                                if (recipient) {
                                io.to(recipient.socketId).emit("reactionAdded", reactionData)
                                }
                            }
                            } catch (error) {
                            socket.emit("error", { message: "Failed to add reaction" })
                            }
                        })

                        // Handle message search (queries MongoDB)
                        socket.on("searchMessages", async (data) => {
                            try {
                            const query = {
                                content: { $regex: data.query, $options: "i" },
                            }

                            if (data.roomId) {
                                query.room = data.roomId
                            } else if (data.recipientId) {
                                query.$or = [
                                { sender: socket.userId, recipient: data.recipientId },
                                { sender: data.recipientId, recipient: socket.userId },
                                ]
                            }

                            const messages = await Message.find(query)
                                .populate("sender", "username avatar")
                                .sort({ createdAt: -1 })
                                .limit(20)
                                

                            socket.emit("searchResults", messages)
                            } catch (error) {
                            socket.emit("error", { message: "Search failed" })
                            }
                        })

                        // Handle loading older messages (pagination from MongoDB)
                        socket.on("loadOlderMessages", async (data) => {
                            try {
                            const query = {}

                            if (data.roomId) {
                                query.room = data.roomId
                            } else if (data.recipientId) {
                                query.$or = [
                                { sender: socket.userId, recipient: data.recipientId },
                                { sender: data.recipientId, recipient: socket.userId },
                                ]
                            }

                            if (data.before) {
                                query.createdAt = { $lt: new Date(data.before) }
                            }

                            const messages = await Message.find(query)
                                .populate("sender", "username avatar")
                                .populate("readBy.user", "username")
                                .sort({ createdAt: -1 })
                                .limit(20)
                            

                            socket.emit("olderMessages", messages.reverse())
                            } catch (error) {
                            socket.emit("error", { message: "Failed to load older messages" })
                            }
                        })

                        // Handle disconnect
                        socket.on("disconnect", async () => {
                            console.log(`User ${socket.username} disconnected`)

                            // Update user status in database (persistence)
                            await User.findByIdAndUpdate(socket.userId, {
                            status: "offline",
                            lastSeen: new Date(),
                            })

                            // Remove from active users map
                            ActiveUsers.delete(socket.userId)

                            // Clean up typing indicators from typingUsers map
                            for (const [key, users] of typingusers.entries()) {
                            users.delete(socket.userId)
                            }

                            // Broadcast user offline status
                            socket.broadcast.emit("userOffline", {
                            userId: socket.userId,
                            username: socket.username,
                            status: "offline",
                            lastSeen: new Date(),
                            })
                        })
//-------------------------------------------------------------------------------------


            })
        })
    })
}

module.exports = handleConnection;
