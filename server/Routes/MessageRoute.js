const express = require('express')
const router = express.Router()
const { getAllMessages } = require("../Controllers/MessageController");
const { authenticate } = require('../middlewares/authenticate');

router.get("/", getAllMessages)

module.exports = router;
