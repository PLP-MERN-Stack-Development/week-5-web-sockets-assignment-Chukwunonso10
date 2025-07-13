// Notification service state
const notificationState = {
  permission: "default",
  soundEnabled: true,
  initialized: false,
}

// Initialize the service
const initNotificationService = () => {
  if (notificationState.initialized) return

  // Check if browser supports notifications
  if ("Notification" in window) {
    notificationState.permission = Notification.permission
  }

  // Load sound preference from localStorage
  const savedSoundPref = localStorage.getItem("soundEnabled")
  if (savedSoundPref !== null) {
    notificationState.soundEnabled = JSON.parse(savedSoundPref)
  }

  notificationState.initialized = true
}

const requestPermission = async () => {
  if ("Notification" in window) {
    const result = await Notification.requestPermission()
    notificationState.permission = result
    return result
  }
  return "denied"
}

const showNotification = (title, options = {}) => {
  if (notificationState.permission === "granted") {
    const notification = new Notification(title, {
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      ...options,
    })

    // Auto close after 5 seconds
    setTimeout(() => {
      notification.close()
    }, 5000)

    return notification
  }
}

const playNotificationSound = () => {
  if (notificationState.soundEnabled) {
    // Create audio element and play notification sound
    const audio = new Audio("/notification-sound.mp3")
    audio.volume = 0.5
    audio.play().catch((e) => console.log("Could not play notification sound:", e))
  }
}

const toggleSound = () => {
  notificationState.soundEnabled = !notificationState.soundEnabled
  localStorage.setItem("soundEnabled", JSON.stringify(notificationState.soundEnabled))
}

const getSoundEnabled = () => {
  if (!notificationState.initialized) {
    initNotificationService()
  }
  return notificationState.soundEnabled
}

const getPermission = () => {
  if (!notificationState.initialized) {
    initNotificationService()
  }
  return notificationState.permission
}

// Initialize on module load
initNotificationService()

// Export the service functions
const notificationService = {
  requestPermission,
  showNotification,
  playNotificationSound,
  toggleSound,
  getSoundEnabled,
  getPermission,
}

export default notificationService
