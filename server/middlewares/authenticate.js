const jwt = require('jsonwebtoken')

const authenticate = (req, res, next) =>{
    try {
        const auth = req.headers.authorization
        if (!auth || !auth.startsWith("Bearer ")) return res.status(403).json({ message: "forbidden"})
        const token = auth.split(" ")[1]

        const decoded = jwt.verify(token)
        req.user = decoded
        next()

    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" })
    }
}


const socketAuth = (socket, next) =>{
    try {
        const auth = socket.handshake.auth?.token
        if (!auth) return next(new Error("No token"))

        const decoded = jwt.verify(token, SECRETE_KEY)
        socket.userId = decoded.userId                       //socket.user = decoded
        socket.userName = decoded.userName                               
        next()

    } catch (error) {
        return next(new Error("Authentication Error"))
    }

}


module.exports = {
    authenticate,
    socketAuth
};
