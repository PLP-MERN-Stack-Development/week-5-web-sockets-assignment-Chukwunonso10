"use client"

import { useState, useEffect } from "react"
import { io } from "socket.io-client"
import apiService from "../services/apiService"
import notificationService from "../services/notificationService"
import Sidebar from "./Sidebar"
import ChatWindow from "./ChatWindow"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LogOut, Menu, Wifi, WifiOff, Volume2, VolumeX, Bell, BellOff } from "lucide-react"

export default function ChatInterface({ user, onLogout }) {
  // Socket state
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [onlineUsers, setOnlineUsers] = useState([])

  // Chat state
  const [activeRoom, setActiveRoom] = useState(null)
  const [activeChat, setActiveChat] = useState(null)
  const [chatType, setChatType] = useState("room") // 'room' or 'private'
  const [rooms, setRooms] = useState([])
  const [users, setUsers] = useState([])
  const [messages, setMessages] = useState([])
  const [unreadCounts, setUnreadCounts] = useState({})

  // UI state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [notificationPermission, setNotificationPermission] = useState("default")

  // Initialize socket connection and services
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem("token")

      const newSocket = io("http://localhost:5000", {
        auth: {
          token: token,
        },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      })

      // Socket connection events
      newSocket.on("connect", () => {
        console.log("Connected to server")
        setIsConnected(true)
        setReconnectAttempts(0)
      })

      newSocket.on("disconnect", (reason) => {
        console.log("Disconnected from server:", reason)
        setIsConnected(false)
      })

      newSocket.on("reconnect", (attemptNumber) => {
        console.log("Reconnected after", attemptNumber, "attempts")
        setIsConnected(true)
        setReconnectAttempts(0)
      })

      newSocket.on("reconnect_attempt", (attemptNumber) => {
        console.log("Reconnection attempt:", attemptNumber)
        setReconnectAttempts(attemptNumber)
      })

      newSocket.on("reconnect_failed", () => {
        console.log("Failed to reconnect")
        setIsConnected(false)
      })

      // Online users events
      newSocket.on("onlineUsers", (users) => {
        setOnlineUsers(users)
      })

      newSocket.on("userOnline", (userData) => {
        setOnlineUsers((prev) => {
          const filtered = prev.filter((u) => u.userId !== userData.userId)
          return [...filtered, userData]
        })
      })

      newSocket.on("userOffline", (userData) => {
        setOnlineUsers((prev) => prev.filter((u) => u.userId !== userData.userId))
      })

      setSocket(newSocket)

      return () => {
        newSocket.close()
      }
    }
  }, [user])

  // Initialize notification service
  useEffect(() => {
    setSoundEnabled(notificationService.getSoundEnabled())
    setNotificationPermission(notificationService.getPermission())

    // Request notification permission on load
    if (notificationService.getPermission() === "default") {
      notificationService.requestPermission().then((permission) => {
        setNotificationPermission(permission)
      })
    }
  }, [])

  // Socket message handlers
  useEffect(() => {
    if (socket) {
      const handleNewMessage = (message) => {
        setMessages((prev) => [...prev, message])

        // Show notification if not in active chat
        const isActiveChat =
          (chatType === "room" && message.room === activeRoom) ||
          (chatType === "private" && (message.sender._id === activeChat?.id || message.recipient === user.id))

        if (!isActiveChat) {
          notificationService.showNotification(`New message from ${message.sender.userName}`, {
            body: message.content,
            tag: `message-${message.id}`,
          })
          notificationService.playNotificationSound()

          // Update unread count
          const chatKey = message.room || message.sender._id
          setUnreadCounts((prev) => ({
            ...prev,
            [chatKey]: (prev[chatKey] || 0) + 1,
          }))
        }
      }

      const handleRoomMessages = (roomMessages) => {
        setMessages(roomMessages)
      }

      const handleUserJoinedRoom = (data) => {
        notificationService.showNotification("User joined", {
          body: `${data.userName} joined the room`,
          tag: "user-joined",
        })
      }

      const handleUserLeftRoom = (data) => {
        notificationService.showNotification("User left", {
          body: `${data.username} left the room`,
          tag: "user-left",
        })
      }

      const handleNotification = (notification) => {
        notificationService.showNotification(notification.message, {
          body: `From ${notification.sender}`,
          tag: notification.type,
        })
        notificationService.playNotificationSound()
      }

      socket.on("newMessage", handleNewMessage)
      socket.on("roomMessages", handleRoomMessages)
      socket.on("userJoinedRoom", handleUserJoinedRoom)
      socket.on("userLeftRoom", handleUserLeftRoom)
      socket.on("notification", handleNotification)

      return () => {
        socket.off("newMessage", handleNewMessage)
        socket.off("roomMessages", handleRoomMessages)
        socket.off("userJoinedRoom", handleUserJoinedRoom)
        socket.off("userLeftRoom", handleUserLeftRoom)
        socket.off("notification", handleNotification)
      }
    }
  }, [socket, activeRoom, activeChat, chatType, user?.id])

  // Fetch initial data using axios
  useEffect(() => {
    fetchRooms()
    fetchUsers()
  }, [])

  const fetchRooms = async () => {
    try {
      const data = await apiService.getRooms()
      setRooms(data)
    } catch (error) {
      console.error("Error fetching rooms:", error)
      if (error.response?.status === 401) {
        onLogout()
      }
    }
  }

  const fetchUsers = async () => {
    try {
      const data = await apiService.getUsers()
      setUsers(data)
    } catch (error) {
      console.error("Error fetching users:", error)
      if (error.response?.status === 401) {
        onLogout()
      }
    }
  }

  const handleRoomSelect = (room) => {
    if (!socket) return

    if (activeRoom && chatType === "room") {
      socket.emit("leaveRoom", activeRoom)
    }

    setActiveRoom(room._id)
    setActiveChat(room)
    setChatType("room")
    setMessages([])
    socket.emit("joinRoom", room._id)
    setIsSidebarOpen(false)

    // Clear unread count
    setUnreadCounts((prev) => ({
      ...prev,
      [room._id]: 0,
    }))
  }

  const handleUserSelect = (selectedUser) => {
    if (!socket) return

    if (activeRoom && chatType === "room") {
      socket.emit("leaveRoom", activeRoom)
    }

    setActiveRoom(selectedUser._id)
    setActiveChat(selectedUser)
    setChatType("private")
    setMessages([])
    setIsSidebarOpen(false)

    // Load private messages
    socket.emit("loadOlderMessages", { recipientId: selectedUser._id })

    // Clear unread count
    setUnreadCounts((prev) => ({
      ...prev,
      [selectedUser._id]: 0,
    }))
  }

  const handleSendMessage = async (content, messageType = "text", fileData = null) => {
    if (socket && activeRoom) {
      const messageData = {
        content,
        messageType,
        ...(chatType === "room" ? { roomId: activeRoom } : { recipientId: activeRoom }),
        ...(fileData && { fileUrl: fileData.fileUrl, fileName: fileData.fileName }),
      }

      socket.emit("sendMessage", messageData)

      // Add message to local state immediately for sender
      const message = {
        id: Date.now().toString(),
        content,
        sender: { _id: user.id, userName: user.userName },
        messageType,
        ...(chatType === "room" ? { room: activeRoom } : { recipient: activeRoom }),
        ...(fileData && { fileUrl: fileData.fileUrl, fileName: fileData.fileName }),
        createdAt: new Date(),
        readBy: [{ user: user.id }],
        reactions: [],
      }
      setMessages((prev) => [...prev, message])
    }
  }

  const handleCreateRoom = async (roomData) => {
    try {
      const newRoom = await apiService.createRoom(roomData)
      setRooms((prev) => [...prev, newRoom])
      return newRoom
    } catch (error) {
      console.error("Error creating room:", error)
      throw error
    }
  }

  const handleToggleSound = () => {
    notificationService.toggleSound()
    setSoundEnabled(notificationService.getSoundEnabled())
  }

  const handleRequestNotificationPermission = async () => {
    const permission = await notificationService.requestPermission()
    setNotificationPermission(permission)
  }

  const ConnectionStatus = () => (
    <div className="flex items-center space-x-2">
      {isConnected ? (
        <>
          <Wifi className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-600">Connected</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-600">
            {reconnectAttempts > 0 ? `Reconnecting... (${reconnectAttempts})` : "Disconnected"}
          </span>
        </>
      )}
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out z-50
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        w-80 h-full
      `}
      >
        <Sidebar
          rooms={rooms}
          users={users}
          onlineUsers={onlineUsers}
          activeRoom={activeRoom}
          activeChat={activeChat}
          chatType={chatType}
          unreadCounts={unreadCounts}
          onRoomSelect={handleRoomSelect}
          onUserSelect={handleUserSelect}
          onCreateRoom={handleCreateRoom}
          user={user}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-800">
                {activeChat
                  ? chatType === "room"
                    ? `# ${activeChat.name}`
                    : `@ ${activeChat.userName}`
                  : "Select a chat"}
              </h1>
              <ConnectionStatus />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleSound}
              title={soundEnabled ? "Disable sounds" : "Enable sounds"}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleRequestNotificationPermission}
              title={notificationPermission === "granted" ? "Notifications enabled" : "Enable notifications"}
            >
              {notificationPermission === "granted" ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </Button>

            <span className="text-sm text-gray-600 hidden sm:inline">Welcome, {user?.userName}</span>

            <Button variant="ghost" size="sm" onClick={onLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Chat window */}
        <div className="flex-1">
          {activeChat ? (
            <ChatWindow
              messages={messages}
              onSendMessage={handleSendMessage}
              currentUser={user}
              activeChat={activeChat}
              chatType={chatType}
              socket={socket}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <h2 className="text-2xl font-semibold text-gray-600 mb-2">Welcome to ChatApp</h2>
                <p className="text-gray-500">Select a room or user from the sidebar to start chatting</p>
                <div className="mt-4 flex items-center justify-center space-x-4">
                  <Badge variant="secondary">{onlineUsers.length} users online</Badge>
                  <Badge variant="secondary">{rooms.length} rooms available</Badge>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
