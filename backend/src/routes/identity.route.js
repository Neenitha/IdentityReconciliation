/** Identity Routes **/

const express = require('express');
const identityController = require('../controllers/identity.controller');
const chkIdentity = require('../middlewares/checkIdentity');

const router = express.Router();

router.post('/', chkIdentity.identityPostValidations, chkIdentity.checkIdentityPost, identityController.identityPOST);

module.exports = router;
