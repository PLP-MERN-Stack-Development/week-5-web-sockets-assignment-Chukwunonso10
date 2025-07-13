const express = require('express')
const router = express.Router()
const { register, login } = require("../Controllers/authController")

router.post("/login", login )
router.post("/register", register )

module.exports = router;
