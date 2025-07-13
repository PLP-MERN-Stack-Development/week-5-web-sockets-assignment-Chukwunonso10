const express = require('express')
const router = express.Router()
const { getAllRooms, createRooms } = require("../Controllers/RoomController");
const { authenticate } = require('../middlewares/authenticate');

router.get("/", getAllRooms);
router.post("/create", createRooms);

module.exports = router;
