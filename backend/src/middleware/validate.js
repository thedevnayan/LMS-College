const { validationResult } = require('express-validator');

/**
 * Middleware that runs validation rules and formats errors for the global error handler
 * @param {Array} rules - Array of express-validator rules
 */
const validate = (rules) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(rules.map((rule) => rule.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Format errors into { field: "message" } mapping
    const extractedErrors = {};
    errors.array().forEach((err) => {
      // express-validator format is typically { path: 'field', msg: 'message' }
      const field = err.path || err.param;
      if (field) {
        extractedErrors[field] = err.msg;
      }
    });

    // Pass to global error handler
    const error = new Error('Validation failed');
    error.statusCode = 400;
    error.errorCode = 'VALIDATION_ERROR';
    error.fields = extractedErrors;
    next(error);
  };
};

module.exports = {
  validate,
};
