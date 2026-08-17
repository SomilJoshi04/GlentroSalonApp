const router = require('express').Router();
const { initiateChat, getChats, getMessages, sendMessage, markAsRead } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.post('/initiate', protect, initiateChat);
router.get('/', protect, getChats);
router.get('/:chatId/messages', protect, getMessages);
router.post('/:chatId/messages', protect, sendMessage);
router.patch('/:chatId/read', protect, markAsRead);

module.exports = router;
