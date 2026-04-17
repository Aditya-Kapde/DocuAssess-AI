const { Router } = require('express');
const { getFileRecord } = require('../controllers/files.controller');

const router = Router();

router.get('/:fileId', getFileRecord);

module.exports = router;