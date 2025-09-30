const Joi = require('joi');

const reportRequestSchema = Joi.object({
  email: Joi.string().email().required(),
});

module.exports = { reportRequestSchema };
