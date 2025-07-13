const User = require('../models/UserModel')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')


const register = async (req, res) => {
    const { userName, email, password } = req.body
    if (!userName || !email || !password) return res.status(400).json({ message: "All fields are required"})
    const user = await User.findOne({ $or: [{userName}, {email}]})
    if (user) return res.status(409).json({ message: "User already exists"});
    const hashedPassword = await bcrypt.hash(password, 10)
    const newuser = await User.create({
        userName: userName,
        email: email,
        password: hashedPassword
    })

    if (!newuser) return res.status(401).json({ message: "Error Registering User"})
    
    const token = jwt.sign({userId: newuser._id, userName: userName}, process.env.SECRET_KEY, {expiresIn:"1hr"})
    res.status(201).json({message: "User Successfully created", user, token})

}



const login = async (req, res) =>{
    try {
        const  { userName, password } = req.body
        const user = await User.findOne({ userName })

        if (!user) return res.status(400).json({ message: "Account not found! Register a new account"})
        const isMatch = await bcrypt.compare(password, user.password)

        if (!isMatch) return res.status(400).json({ message: "Enter the correct password "})
        const token = jwt.sign({userId: user._id, userName: userName}, process.env.SECRET_KEY, {expiresIn:"1hr"})

        res.status(200).json({message: "User Successfully Logged in", user: {
        userId: user._id,
        userName: user.userName,
        email: user.email
    }, token})
    } catch (error) {
        res.status(500).json({ message: "server Error", error:error.message})
    }
}


module.exports = {
    register,
    login
}