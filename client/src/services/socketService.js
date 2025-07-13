import { io } from "socket.io-client"

// Socket service state
const socketState = {
  socket: null,
  isConnected: false,
  reconnectAttempts: 0,
  onlineUsers: [],
  eventHandlers: {},
}

// Event emitter functionality
const on = (event, handler) => {
  if (!socketState.eventHandlers[event]) {
    socketState.eventHandlers[event] = []
  }
  socketState.eventHandlers[event].push(handler)
}

const off = (event, handler) => {
  if (socketState.eventHandlers[event]) {
    socketState.eventHandlers[event] = socketState.eventHandlers[event].filter((h) => h !== handler)
  }
}

const emit = (event, data) => {
  if (socketState.eventHandlers[event]) {
    socketState.eventHandlers[event].forEach((handler) => handler(data))
  }
}

// Simple socket connection utility
const createSocketConnection = (user) => {
  if (!user) return null

  const token = localStorage.getItem("token")

  const socket = io("http://localhost:5000", {
    auth: {
      token: token,
    },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  })

  socket.on("connect", () => {
    console.log("Connected to server")
    socketState.isConnected = true
    socketState.reconnectAttempts = 0
    emit("connectionChange", { isConnected: true, reconnectAttempts: 0 })
  })

  socket.on("disconnect", (reason) => {
    console.log("Disconnected from server:", reason)
    socketState.isConnected = false
    emit("connectionChange", { isConnected: false, reconnectAttempts: socketState.reconnectAttempts })
  })

  socket.on("reconnect", (attemptNumber) => {
    console.log("Reconnected after", attemptNumber, "attempts")
    socketState.isConnected = true
    socketState.reconnectAttempts = 0
    emit("connectionChange", { isConnected: true, reconnectAttempts: 0 })
  })

  socket.on("reconnect_attempt", (attemptNumber) => {
    console.log("Reconnection attempt:", attemptNumber)
    socketState.reconnectAttempts = attemptNumber
    emit("connectionChange", { isConnected: false, reconnectAttempts: attemptNumber })
  })

  socket.on("reconnect_failed", () => {
    console.log("Failed to reconnect")
    socketState.isConnected = false
    emit("connectionChange", { isConnected: false, reconnectAttempts: socketState.reconnectAttempts })
  })

  socket.on("onlineUsers", (users) => {
    socketState.onlineUsers = users
    emit("onlineUsersChange", users)
  })

  socket.on("userOnline", (userData) => {
    socketState.onlineUsers = socketState.onlineUsers.filter((u) => u.userId !== userData.userId)
    socketState.onlineUsers.push(userData)
    emit("onlineUsersChange", socketState.onlineUsers)
  })

  socket.on("userOffline", (userData) => {
    socketState.onlineUsers = socketState.onlineUsers.filter((u) => u.userId !== userData.userId)
    emit("onlineUsersChange", socketState.onlineUsers)
  })

  socketState.socket = socket
  return socket
}

const disconnect = () => {
  if (socketState.socket) {
    socketState.socket.close()
    socketState.socket = null
    socketState.isConnected = false
    socketState.onlineUsers = []
  }
}

const getSocket = () => {
  return socketState.socket
}

const getIsConnected = () => {
  return socketState.isConnected
}

const getReconnectAttempts = () => {
  return socketState.reconnectAttempts
}

const getOnlineUsers = () => {
  return socketState.onlineUsers
}

// Export the service functions
const socketService = {
  createSocketConnection,
  disconnect,
  on,
  off,
  emit,
  getSocket,
  getIsConnected,
  getReconnectAttempts,
  getOnlineUsers,
}

export default socketService
