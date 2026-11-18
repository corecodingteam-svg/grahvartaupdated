const router = require('express').Router();
const ctrl = require('../controllers/astrologerController');
const { authenticate } = require('../middleware/auth');

// Specific routes BEFORE wildcard /:id
router.get('/', ctrl.listAstrologers);
router.post('/register', authenticate, ctrl.registerAsAstrologer);
router.patch('/availability', authenticate, ctrl.updateAvailability);
router.get('/me/dashboard', authenticate, ctrl.getAstrologerDashboard);
router.get('/me/wallet', authenticate, ctrl.getAstrologerWallet);
router.get('/me/transactions', authenticate, ctrl.getAstrologerTransactions);
router.get('/consultations/history', authenticate, ctrl.getConsultationHistory);
router.get('/consultations/:id/messages', authenticate, ctrl.getConsultationMessages);
router.get('/consultations/:id/transcript', authenticate, ctrl.getConsultationTranscript);
router.get('/me/blocked-users', authenticate, ctrl.listBlockedUsers);
router.post('/me/blocked-users/:userId', authenticate, ctrl.blockUser);
router.delete('/me/blocked-users/:userId', authenticate, ctrl.unblockUser);
router.get('/threads', authenticate, ctrl.getChatThreads);
// Astrologer tools: welcome message, remedies, sounds, performance
const tools = require('../controllers/astrologerToolsController');
router.get('/me/chat-settings', authenticate, tools.getChatSettings);
router.put('/me/welcome', authenticate, tools.updateWelcome);
router.post('/me/remedies', authenticate, tools.createRemedy);
router.put('/me/remedies/:id', authenticate, tools.updateRemedy);
router.delete('/me/remedies/:id', authenticate, tools.deleteRemedy);
router.get('/me/notification-prefs', authenticate, tools.getNotificationPrefs);
router.put('/me/notification-prefs', authenticate, tools.updateNotificationPrefs);
router.get('/me/performance', authenticate, tools.getPerformance);
router.get('/me/schedule', authenticate, tools.getSchedule);
router.put('/me/schedule', authenticate, tools.updateSchedule);
router.get('/threads/:userId/messages', authenticate, ctrl.getUserThreadMessages);

// Wildcard routes LAST
router.get('/:id', ctrl.getAstrologer);
router.get('/:id/reviews', ctrl.getAstrologerReviews);
router.post('/:id/reviews', authenticate, ctrl.submitReview);

module.exports = router;
