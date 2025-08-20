const express = require('express');
const { fetchAllViewForSearch, fetchFieldsForSearch, fetchFieldsOptions, fetchSearchedData, generateCSVForBarcode } = require('../controllers/configController');

const router = express.Router();

router.get('/fetchViews', fetchAllViewForSearch);
router.get('/fetchFields', fetchFieldsForSearch);
router.get('/fetchFieldOptions', fetchFieldsOptions);
router.get('/fetchData', fetchSearchedData);
router.post('/generateCSVBarcode', generateCSVForBarcode);

module.exports = router;
