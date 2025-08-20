const express = require('express');
const { searchViewForm } = require('../controllers/viewsController');

const router = express.Router();

router.get('/details', searchViewForm);

module.exports = router;
