const { Router } = require('express');
const { exportQuestions } = require('../controllers/export.controller');

const router = Router();

router.post('/', exportQuestions);

module.exports = router;
