"use client"

import { useState, useEffect } from "react"
import apiService from "./services/apiService"
import LoginForm from "./components/LoginForm"
import ChatInterface from "./components/ChatInterface"

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("token")
    const userData = localStorage.getItem("user")

    if (token && userData) {
      apiService.setAuthToken(token)
      setIsAuthenticated(true)
      setUser(JSON.parse(userData))
    }
    setIsLoading(false)
  }, [])

  const handleLogin = async (loginData) => {
    try {
      const data = await apiService.login(loginData)
      localStorage.setItem("token", data.token)
      localStorage.setItem("user", JSON.stringify(data.user))
      apiService.setAuthToken(data.token)
      setIsAuthenticated(true)
      setUser(data.user)
      return data
    } catch (error) {
      console.error("Login error:", error)
      throw error
    }
  }

  const handleRegister = async (registerData) => {
    try {
      const data = await apiService.register(registerData)
      localStorage.setItem("token", data.token)
      localStorage.setItem("user", JSON.stringify(data.user))
      apiService.setAuthToken(data.token)
      setIsAuthenticated(true)
      setUser(data.user)
      return data
    } catch (error) {
      console.error("Registration error:", error)
      throw error
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    apiService.setAuthToken(null)
    setIsAuthenticated(false)
    setUser(null)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {!isAuthenticated ? (
        <LoginForm onLogin={handleLogin} onRegister={handleRegister} />
      ) : (
        <ChatInterface user={user} onLogout={handleLogout} />
      )}
    </div>
  )
}
