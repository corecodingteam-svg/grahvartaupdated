const router = require('express').Router();
const ctrl = require('../controllers/walletController');
const { authenticate } = require('../middleware/auth');

router.get('/recharge-offers', ctrl.getRechargeOffers);
router.get('/', authenticate, ctrl.getWallet);
router.get('/stats', authenticate, ctrl.getWalletStats);
router.get('/transactions', authenticate, ctrl.getTransactions);
router.post('/add-money/order', authenticate, ctrl.createAddMoneyOrder);
router.post('/add-money/verify', authenticate, ctrl.verifyAndCredit);
router.post('/add-money/reconcile', authenticate, ctrl.reconcilePending);
// POST /razorpay-webhook is mounted in server.js with a raw body parser
router.get('/plans', ctrl.getSubscriptionPlans);
router.post('/subscribe', authenticate, ctrl.purchaseSubscription);

module.exports = router;
