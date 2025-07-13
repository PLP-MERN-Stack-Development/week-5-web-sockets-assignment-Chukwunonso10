"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Plus, Hash, X, MessageCircle, Search } from "lucide-react"

export default function Sidebar({
  rooms,
  users,
  onlineUsers,
  activeRoom,
  activeChat,
  chatType,
  unreadCounts,
  onRoomSelect,
  onUserSelect,
  onCreateRoom,
  user,
  onClose,
}) {
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState("")
  const [newRoomDescription, setNewRoomDescription] = useState("")
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const handleCreateRoom = async (e) => {
    e.preventDefault()
    if (!newRoomName.trim()) return

    setIsCreatingRoom(true)
    try {
      await onCreateRoom({
        name: newRoomName.trim(),
        description: newRoomDescription.trim(),
        isPrivate: false,
      })

      setNewRoomName("")
      setNewRoomDescription("")
      setShowCreateRoom(false)
    } catch (error) {
      console.error("Error creating room:", error)
      // You could add error state here to show user feedback
    } finally {
      setIsCreatingRoom(false)
    }
  }

  const filteredRooms = rooms.filter((room) => room.name.toLowerCase().includes(searchTerm.toLowerCase()))

  const filteredUsers = users.filter((u) => u.username.toLowerCase().includes(searchTerm.toLowerCase()))

  const getUserStatus = (userId) => {
    return onlineUsers.find((u) => u.userId === userId) ? "online" : "offline"
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">💬 ChatApp</h2>
        <Button variant="ghost" size="sm" className="lg:hidden" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search rooms or users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <Tabs defaultValue="rooms" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mx-4 mt-4">
            <TabsTrigger value="rooms">Rooms</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="online">Online</TabsTrigger>
          </TabsList>

          <TabsContent value="rooms" className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700">Chat Rooms</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateRoom(!showCreateRoom)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {showCreateRoom && (
              <form onSubmit={handleCreateRoom} className="mb-4 space-y-2">
                <Input
                  placeholder="Room name"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="text-sm"
                  required
                />
                <Input
                  placeholder="Room description (optional)"
                  value={newRoomDescription}
                  onChange={(e) => setNewRoomDescription(e.target.value)}
                  className="text-sm"
                />
                <div className="flex space-x-2">
                  <Button type="submit" size="sm" className="flex-1" disabled={isCreatingRoom}>
                    {isCreatingRoom ? "Creating..." : "Create"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateRoom(false)}
                    disabled={isCreatingRoom}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {filteredRooms.map((room) => (
                <Button
                  key={room._id}
                  variant={activeRoom === room._id && chatType === "room" ? "default" : "ghost"}
                  className="w-full justify-start text-left h-auto p-3"
                  onClick={() => onRoomSelect(room)}
                >
                  <div className="flex items-center space-x-3 w-full">
                    <Hash className="h-4 w-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{room.name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {room.description || `${room.members?.length || 0} members`}
                      </div>
                    </div>
                    {unreadCounts[room._id] > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {unreadCounts[room._id]}
                      </Badge>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="users" className="p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-4">All Users</h3>
            <div className="space-y-2">
              {filteredUsers.map((chatUser) => (
                <Button
                  key={chatUser._id}
                  variant={activeRoom === chatUser._id && chatType === "private" ? "default" : "ghost"}
                  className="w-full justify-start text-left h-auto p-3"
                  onClick={() => onUserSelect(chatUser)}
                >
                  <div className="flex items-center space-x-3 w-full">
                    <div className="relative">
                      <MessageCircle className="h-4 w-4 flex-shrink-0" />
                      <div
                        className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                          getUserStatus(chatUser._id) === "online" ? "bg-green-500" : "bg-gray-400"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{chatUser.username}</div>
                      <div className="text-xs text-gray-500">
                        {getUserStatus(chatUser._id) === "online" ? "Online" : "Offline"}
                      </div>
                    </div>
                    {unreadCounts[chatUser._id] > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {unreadCounts[chatUser._id]}
                      </Badge>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="online" className="p-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Online Users ({onlineUsers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {onlineUsers.map((onlineUser) => (
                    <div key={onlineUser.userId} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-sm text-gray-700">{onlineUser.username}</span>
                      {onlineUser.userId === user.id && (
                        <Badge variant="secondary" className="text-xs">
                          You
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  )
}
