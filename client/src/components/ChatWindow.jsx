"use client"

import { useState, useEffect, useRef } from "react"
import apiService from "../services/apiService"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Send, Paperclip, Search, Smile, Heart, Laugh, Angry, Frown, ThumbsUp, Download, File } from "lucide-react"

export default function ChatWindow({ messages, onSendMessage, currentUser, activeChat, chatType, socket }) {
  const [newMessage, setNewMessage] = useState("")
  const [typingUsers, setTypingUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(null)
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const typingTimeoutRef = useRef()
  const fileInputRef = useRef()

  const reactions = [
    { emoji: "👍", name: "like", icon: ThumbsUp },
    { emoji: "❤️", name: "love", icon: Heart },
    { emoji: "😂", name: "laugh", icon: Laugh },
    { emoji: "😠", name: "angry", icon: Angry },
    { emoji: "😢", name: "sad", icon: Frown },
  ]

  const [localMessages, setLocalMessages] = useState(messages)

  useEffect(() => {
    scrollToBottom()
  }, [localMessages])

  useEffect(() => {
    if (socket) {
      const handleUserTyping = (data) => {
        if (data.userId !== currentUser.id) {
          setTypingUsers((prev) => {
            if (!prev.includes(data.username)) {
              return [...prev, data.username]
            }
            return prev
          })
        }
      }

      const handleUserStoppedTyping = (data) => {
        setTypingUsers((prev) => prev.filter((username) => username !== data.username))
      }

      const handleSearchResults = (results) => {
        setSearchResults(results)
      }

      const handleOlderMessages = (olderMessages) => {
        setLocalMessages((prev) => [...olderMessages, ...prev])
        setIsLoadingOlder(false)
      }

      const handleReactionAdded = (data) => {
        setLocalMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.messageId ? { ...msg, reactions: [...(msg.reactions || []), data] } : msg,
          ),
        )
      }

      socket.on("userTyping", handleUserTyping)
      socket.on("userStoppedTyping", handleUserStoppedTyping)
      socket.on("searchResults", handleSearchResults)
      socket.on("olderMessages", handleOlderMessages)
      socket.on("reactionAdded", handleReactionAdded)

      return () => {
        socket.off("userTyping", handleUserTyping)
        socket.off("userStoppedTyping", handleUserStoppedTyping)
        socket.off("searchResults", handleSearchResults)
        socket.off("olderMessages", handleOlderMessages)
        socket.off("reactionAdded", handleReactionAdded)
      }
    }
  }, [currentUser.id, socket])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (newMessage.trim() && socket) {
      onSendMessage(newMessage.trim())
      setNewMessage("")

      socket.emit("stopTyping", {
        ...(chatType === "room" ? { roomId: activeChat._id } : { recipientId: activeChat._id }),
      })
    }
  }

  const handleInputChange = (e) => {
    setNewMessage(e.target.value)

    if (socket) {
      socket.emit("typing", {
        ...(chatType === "room" ? { roomId: activeChat._id } : { recipientId: activeChat._id }),
      })

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stopTyping", {
          ...(chatType === "room" ? { roomId: activeChat._id } : { recipientId: activeChat._id }),
        })
      }, 1000)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      const fileData = await apiService.uploadFile(file)
      const messageType = file.type.startsWith("image/") ? "image" : "file"
      onSendMessage(`Shared ${messageType}: ${file.name}`, messageType, fileData)
    } catch (error) {
      console.error("File upload failed:", error)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchTerm.trim() && socket) {
      socket.emit("searchMessages", {
        query: searchTerm,
        ...(chatType === "room" ? { roomId: activeChat._id } : { recipientId: activeChat._id }),
      })
    }
  }

  const handleReaction = (messageId, reaction) => {
    if (socket) {
      socket.emit("addReaction", {
        messageId,
        reaction,
        ...(chatType === "room" ? { roomId: activeChat._id } : { recipientId: activeChat._id }),
      })
      setShowEmojiPicker(null)
    }
  }

  const loadOlderMessages = () => {
    if (localMessages.length > 0 && !isLoadingOlder && socket) {
      setIsLoadingOlder(true)
      socket.emit("loadOlderMessages", {
        before: localMessages[0].createdAt,
        ...(chatType === "room" ? { roomId: activeChat._id } : { recipientId: activeChat._id }),
      })
    }
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "Today"
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday"
    } else {
      return date.toLocaleDateString()
    }
  }

  const groupMessagesByDate = (messages) => {
    const groups = {}
    messages.forEach((message) => {
      const date = formatDate(message.createdAt)
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(message)
    })
    return groups
  }

  const messageGroups = groupMessagesByDate(localMessages)

  const renderMessage = (message) => {
    const isOwn = message.sender._id === currentUser.id
    const messageReactions = message.reactions || []

    return (
      <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} group`}>
        <div className={`max-w-xs lg:max-w-md relative ${isOwn ? "order-2" : "order-1"}`}>
          <div className={`px-4 py-2 rounded-lg ${isOwn ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"}`}>
            {!isOwn && <div className="text-xs font-medium mb-1 opacity-75">{message.sender.username}</div>}

            {message.messageType === "image" && message.fileUrl && (
              <div className="mb-2">
                <img
                  src={`http://localhost:5000${message.fileUrl}`}
                  alt={message.fileName}
                  className="max-w-full h-auto rounded cursor-pointer"
                  onClick={() => window.open(`http://localhost:5000${message.fileUrl}`, "_blank")}
                />
              </div>
            )}

            {message.messageType === "file" && message.fileUrl && (
              <div className="mb-2 flex items-center space-x-2 p-2 bg-black bg-opacity-10 rounded">
                <File className="h-4 w-4" />
                <span className="text-sm truncate flex-1">{message.fileName}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open(`http://localhost:5000${message.fileUrl}`, "_blank")}
                >
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            )}

            <div className="text-sm">{message.content}</div>
            <div className={`text-xs mt-1 ${isOwn ? "text-blue-100" : "text-gray-500"}`}>
              {formatTime(message.createdAt)}
              {message.readBy && message.readBy.length > 1 && <span className="ml-2">✓✓</span>}
            </div>
          </div>

          {/* Reactions */}
          {messageReactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {reactions.map((reaction) => {
                const count = messageReactions.filter((r) => r.reaction === reaction.name).length
                if (count === 0) return null

                return (
                  <Badge
                    key={reaction.name}
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-gray-300"
                    onClick={() => handleReaction(message.id, reaction.name)}
                  >
                    {reaction.emoji} {count}
                  </Badge>
                )
              })}
            </div>
          )}

          {/* Reaction picker */}
          {showEmojiPicker === message.id && (
            <Card className="absolute bottom-full mb-2 p-2 z-10 shadow-lg">
              <div className="flex space-x-1">
                {reactions.map((reaction) => (
                  <Button
                    key={reaction.name}
                    size="sm"
                    variant="ghost"
                    onClick={() => handleReaction(message.id, reaction.name)}
                    className="text-lg p-1 h-8 w-8"
                  >
                    {reaction.emoji}
                  </Button>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Reaction button */}
        <Button
          size="sm"
          variant="ghost"
          className={`opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? "order-1 mr-2" : "order-2 ml-2"}`}
          onClick={() => setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id)}
        >
          <Smile className="h-3 w-3" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      {showSearch && (
        <div className="border-b border-gray-200 p-4">
          <form onSubmit={handleSearch} className="flex space-x-2">
            <Input
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="sm">
              <Search className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowSearch(false)}>
              Cancel
            </Button>
          </form>

          {searchResults.length > 0 && (
            <div className="mt-2 max-h-32 overflow-y-auto">
              <p className="text-sm text-gray-600 mb-2">Search Results:</p>
              {searchResults.map((result) => (
                <div key={result._id} className="text-sm p-2 bg-gray-50 rounded mb-1">
                  <strong>{result.sender.username}:</strong> {result.content}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={messagesContainerRef}>
        {/* Load older messages button */}
        {localMessages.length > 0 && (
          <div className="text-center mb-4">
            <Button variant="ghost" size="sm" onClick={loadOlderMessages} disabled={isLoadingOlder}>
              {isLoadingOlder ? "Loading..." : "Load older messages"}
            </Button>
          </div>
        )}

        {/* Messages grouped by date */}
        {Object.entries(messageGroups).map(([date, dateMessages]) => (
          <div key={date}>
            <div className="text-center my-4">
              <Badge variant="secondary" className="text-xs">
                {date}
              </Badge>
            </div>
            <div className="space-y-4">{dateMessages.map(renderMessage)}</div>
          </div>
        ))}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex justify-start mt-4">
            <div className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
                <span>
                  {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Message input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center space-x-2 mb-2">
          <Button variant="ghost" size="sm" onClick={() => setShowSearch(!showSearch)}>
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="h-4 w-4" />
          </Button>
          <input ref={fileInputRef} type="file" hidden onChange={handleFileUpload} accept="image/*,*" />
        </div>

        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={handleInputChange}
            placeholder={`Message ${chatType === "room" ? `#${activeChat.name}` : `@${activeChat.username}`}...`}
            className="flex-1"
            autoComplete="off"
          />
          <Button type="submit" disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
