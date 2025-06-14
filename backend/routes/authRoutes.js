const express = require('express');
const router = express.Router();
const { login, changePassword } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/login', login);
router.put('/change-password', authMiddleware, changePassword);

module.exports = router;