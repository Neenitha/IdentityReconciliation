const {validationResult, body, oneOf } = require('express-validator');
const httpStatus = require('http-status');

// check the request body. either of phone or email has to exist. if email
// exist, it should be in proper email format
const identityPostValidations = [
  oneOf([
    body('phoneNumber').notEmpty(),
    body('email').notEmpty()
  ]),
  body('email').if(body('email').notEmpty())
    .isEmail()
    .withMessage('Email not in proper format'),
];

const checkIdentityPost = async( req, res, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    next();
  }
  else {
    res.status(httpStatus.status.BAD_REQUEST).send({ errors: errors.array() });
  }
}

module.exports = {
  checkIdentityPost,
  identityPostValidations
}
