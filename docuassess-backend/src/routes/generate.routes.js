const { Router } = require('express');
const { generate } = require('../controllers/generate.controller');
const validateRequest = require('../middleware/validateRequest');
const { generateRequestSchema } = require('../validators/generate.validator');

const router = Router();

router.post(
  '/',
  validateRequest(generateRequestSchema, 'body'),
  generate
);

module.exports = router;