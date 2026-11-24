const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticateAdmin, requirePermission } = require('../middleware/adminAuth');
const ctrl = require('../controllers/adminController');
const moderation = require('../controllers/moderationController');
const { auditAdminActions } = require('../middleware/auditLog');

// Every state-changing admin request (including login attempts) is written to admin_audit_logs
router.use(auditAdminActions);

// Auth (no middleware)
router.post('/login', [
  body('email').trim().isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('password').isString().notEmpty().withMessage('Password is required'),
], validate, ctrl.login);

// All routes below require admin token
router.use(authenticateAdmin);

// Helper: require superadmin access
const requireSuperAdmin = (req, res, next) => {
  if (req.admin.isSuperAdmin) {
    return next();
  }
  res.status(403).json({ success: false, message: 'Superadmin access required' });
};

// Sub-admins may only use the sections they were granted (the admin panel
// hides other menus, but the API itself must refuse them too). Superadmins
// pass everything. Keys match admin-portal SubadminsPage PERMISSIONS.
const SECTION_PERMISSIONS = [
  ['/dashboard', 'dashboard'],
  ['/users', 'users'],
  ['/astrologers', 'astrologers'],
  ['/withdrawals', 'withdrawals'],
  ['/reports', 'reports'],
  ['/transactions', 'transactions'],
  ['/wallet', 'transactions'],
  ['/community', 'community'],
  ['/notifications', 'notifications'],
  ['/hirings', 'hirings'],
  ['/agent-messages', 'hirings'],
  ['/recharge-offers', 'recharge_offers'],
  ['/moderation', 'moderation'],
];
router.use((req, res, next) => {
  if (req.admin?.isSuperAdmin) return next();
  const section = SECTION_PERMISSIONS.find(([prefix]) => req.path === prefix || req.path.startsWith(prefix + '/'));
  if (!section) return next(); // superadmin-only routes are guarded separately below
  if (Array.isArray(req.admin?.permissions) && req.admin.permissions.includes(section[1])) return next();
  return res.status(403).json({ success: false, message: 'You do not have permission for this section' });
});

// Dashboard
router.get('/dashboard', ctrl.getDashboardStats);

// User Management
router.get('/users', ctrl.listUsers);
router.get('/users/:id', ctrl.getUser);
router.post('/users/:id/ban', ctrl.banUser);
router.post('/users/:id/unban', ctrl.unbanUser);

// Astrologer Management
router.get('/astrologers', ctrl.listAstrologers);
router.post('/astrologers/:id/approve', ctrl.approveAstrologer);
router.post('/astrologers/:id/reject', ctrl.rejectAstrologer);
router.put('/astrologers/:id/rates', ctrl.setAstrologerRates);
router.put('/astrologers/:id', ctrl.updateAstrologerProfile);
router.post('/astrologers/:id/toggle-online', ctrl.toggleAstrologerOnline);
router.post('/astrologers/:id/ban', ctrl.banAstrologer);
router.post('/astrologers/:id/unban', ctrl.unbanAstrologer);
router.get('/astrologers/:id/earnings', ctrl.getAstrologerEarnings);

// Reports Management
router.get('/reports', ctrl.listReports);
router.post('/reports', ctrl.createReport);
router.put('/reports/:id', ctrl.updateReport);
router.delete('/reports/:id', ctrl.deleteReport);
router.post('/reports/:id/toggle', ctrl.toggleReport);
router.get('/reports/:id/stats', ctrl.getReportStats);

// Wallet & Transactions
router.get('/transactions', ctrl.listTransactions);
router.post('/wallet/credit', [
  body('user_id').isUUID().withMessage('Valid user_id required'),
  body('amount').isFloat({ gt: 0, max: 1000000 }).withMessage('Amount must be a positive number').toFloat(),
], validate, ctrl.manualCredit);
router.post('/wallet/debit', [
  body('user_id').isUUID().withMessage('Valid user_id required'),
  body('amount').isFloat({ gt: 0, max: 1000000 }).withMessage('Amount must be a positive number').toFloat(),
], validate, ctrl.manualDebit);
router.post('/transactions/:id/refund', ctrl.refundTransaction);

// Withdrawal Requests
router.get('/withdrawals', ctrl.listWithdrawals);
router.post('/withdrawals/:id/approve', ctrl.approveWithdrawal);
router.post('/withdrawals/:id/reject', ctrl.rejectWithdrawal);

// Community Moderation
router.get('/community', ctrl.listCommunityPosts);
router.post('/community/:id/approve', ctrl.approvePost);
router.post('/community/:id/reject', ctrl.rejectPost);
router.delete('/community/:id', ctrl.deletePostAdmin);

// Push Notifications
router.post('/notifications/broadcast', [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('body').trim().notEmpty().withMessage('Message is required'),
], validate, ctrl.sendBroadcastNotification);
router.post('/notifications/segment', [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('body').trim().notEmpty().withMessage('Message is required'),
], validate, ctrl.sendSegmentedNotification);

const hiringCtrl = require('../controllers/hiringController');
router.get('/hirings', hiringCtrl.listApplications);
router.patch('/hirings/:id', hiringCtrl.updateStatus);
router.put('/hirings/:id/profile', hiringCtrl.updateProfile);
router.post('/hirings/:id/activate-as-astrologer', hiringCtrl.activateAsAstrologer);
router.post('/hirings/:id/resend-email', hiringCtrl.resendWelcomeEmail);
router.post('/hirings/:id/reset-password', hiringCtrl.resetPassword);

// Agent "Write to Us" messages (Hirings permission)
const agentMessages = require('../controllers/agentMessageController');
router.get('/agent-messages', agentMessages.adminList);
router.patch('/agent-messages/:id', agentMessages.adminUpdate);

// Recharge Offers Management
const walletCtrl = require('../controllers/walletController');
router.get('/recharge-offers', walletCtrl.adminListOffers);
router.post('/recharge-offers', walletCtrl.adminCreateOffer);
router.put('/recharge-offers/:id', walletCtrl.adminUpdateOffer);
router.delete('/recharge-offers/:id', walletCtrl.adminDeleteOffer);

// Rule violators: astrologers / users who tried to share contact details
router.get('/moderation/violators', moderation.listViolators);
router.get('/moderation/:userId', moderation.getSubjectHistory);
router.post('/moderation/:userId/warn', moderation.warn);
router.post('/moderation/:userId/hold', moderation.hold);
router.post('/moderation/:userId/release', moderation.release);
router.post('/moderation/:userId/lock', moderation.lock);
router.post('/moderation/:userId/unlock', moderation.unlock);

// Audit log (superadmin only)
router.get('/audit-logs', requireSuperAdmin, ctrl.listAuditLogs);
router.get('/audit-logs/filters', requireSuperAdmin, ctrl.getAuditLogFilters);

// Sub-admin Management (superadmin only)
router.get('/sub-admins', requireSuperAdmin, ctrl.listSubAdmins);
router.post('/sub-admins', requireSuperAdmin, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Enter a valid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], validate, ctrl.createSubAdmin);
router.put('/sub-admins/:id', requireSuperAdmin, ctrl.updateSubAdmin);
router.delete('/sub-admins/:id', requireSuperAdmin, ctrl.deleteSubAdmin);

module.exports = router;
