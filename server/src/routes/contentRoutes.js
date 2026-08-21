const express = require('express');
const router = express.Router();
const { getContentByType } = require('../controllers/contentController');

router.get('/:type', getContentByType);

module.exports = router;
