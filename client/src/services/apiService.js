import axios from "axios"

// Configure axios defaults
axios.defaults.baseURL = "https://real-time-chat-application-b9dc.onrender.com"||"http://localhost:5000"
axios.defaults.timeout = 10000

// Request interceptor to add auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

//Response interceptor for error handling
axios.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 407) {
      //Token expired or invalid
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      window.location.href = "/"
    }
    return Promise.reject(error)
  },
)

// API service functions
const setAuthToken = (token) => {
  if (token) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`
  } else {
    delete axios.defaults.headers.common["Authorization"]
  }
}

const login = async (loginData) => {
  const response = await axios.post("/api/auth/login", loginData)
  return response.data
}

const register = async (registerData) => {
  const response = await axios.post("/api/auth/register", registerData)
  return response.data
}

const getRooms = async () => {
  const response = await axios.get("/api/rooms")
  return response.data
}

const createRoom = async (roomData) => {
  const response = await axios.post("/api/rooms/create", roomData)
  return response.data
}

// const getUsers = async () => {
//   const response = await axios.get("/api/users")
//   return response.data
// }

const uploadFile = async (file) => {
  const formData = new FormData()
  formData.append("file", file)

  const response = await axios.post("/api/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (progressEvent) => {
      const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
      console.log(`Upload Progress: ${percentCompleted}%`)
    },
  })
  return response.data
}

// const getUserProfile = async (userId) => {
//   const response = await axios.get(`/api/users/${userId}`)
//   return response.data
// }

const updateUserProfile = async (userId, profileData) => {
  const response = await axios.put(`/api/users/${userId}`, profileData)
  return response.data
}

const updateUserStatus = async (status) => {
  const response = await axios.patch("/api/users/status", { status })
  return response.data
}

const getRoomMembers = async (roomId) => {
  const response = await axios.get(`/api/rooms/${roomId}/members`)
  return response.data
}

const addRoomMember = async (roomId, userId) => {
  const response = await axios.post(`/api/rooms/${roomId}/members`, { userId })
  return response.data
}

const removeRoomMember = async (roomId, userId) => {
  const response = await axios.delete(`/api/rooms/${roomId}/members/${userId}`)
  return response.data
}

const deleteRoom = async (roomId) => {
  const response = await axios.delete(`/api/rooms/${roomId}`)
  return response.data
}

const getMessageHistory = async (roomId, page = 1, limit = 50) => {
  const response = await axios.get(`/api/messages`, {
    params: { roomId, page, limit },
  })
  return response.data
}

const getPrivateMessageHistory = async (recipientId, page = 1, limit = 50) => {
  const response = await axios.get(`/api/messages/private`, {
    params: { recipientId, page, limit },
  })
  return response.data
}

const searchMessages = async (query, roomId = null, recipientId = null) => {
  const response = await axios.get(`/api/messages/search`, {
    params: { query, roomId, recipientId },
  })
  return response.data
}

const deleteMessage = async (messageId) => {
  const response = await axios.delete(`/api/messages/${messageId}`)
  return response.data
}

const editMessage = async (messageId, content) => {
  const response = await axios.put(`/api/messages/${messageId}`, { content })
  return response.data
}

// Export the API service functions
const apiService = {
  setAuthToken,
  login,
  register,
  getRooms,
  createRoom,
  uploadFile,
  updateUserProfile,
  updateUserStatus,
  getRoomMembers,
  addRoomMember,
  removeRoomMember,
  deleteRoom,
  getMessageHistory,
  getPrivateMessageHistory,
  searchMessages,
  deleteMessage,
  editMessage,
}

export default apiService
