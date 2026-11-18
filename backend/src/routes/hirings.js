const router = require('express').Router();
const ctrl = require('../controllers/hiringController');

router.post('/upload-photo', (req, res, next) => {
  ctrl.upload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
}, ctrl.uploadPhoto);
router.post('/send-otp', ctrl.sendEmailOtp);
router.post('/verify-otp', ctrl.verifyEmailOtp);
router.post('/apply', ctrl.submitApplication);
router.get('/status', ctrl.getStatus);

// "Write to Us" from the agent app (identified by mobile + registered device)
const agentMessages = require('../controllers/agentMessageController');
router.post('/messages', agentMessages.sendMessage);
router.get('/messages', agentMessages.listOwnMessages);

module.exports = router;
