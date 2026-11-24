const { validationResult } = require('express-validator');

// express-validator only collects errors; this rejects the request when any
// rule failed. Without it the body()/query() rules on a route are no-ops.
module.exports = function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const list = errors.array();
  return res.status(400).json({
    success: false,
    message: list[0].msg,
    errors: list.map((e) => ({ field: e.path, message: e.msg })),
  });
};
