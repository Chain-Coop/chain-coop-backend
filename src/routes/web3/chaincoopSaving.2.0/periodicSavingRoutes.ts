// routes/periodicSavingRoutes.ts
import express from 'express';
import { PeriodicSavingController } from '../../../controllers/web3/chaincoopSaving.2.0/periodicSavingController';
import { authorize } from '../../../middlewares/authorization'; // Your authentication middleware

const router = express.Router();

// Create a new periodic saving
router.post(
  '/openPeriodicPool',
  authorize,
  PeriodicSavingController.createPeriodicSaving
);

// Get all user's periodic savings
router.get(
  '/getPeriodicPool',
  authorize,
  PeriodicSavingController.getUserPeriodicSavings
);

// Get specific periodic saving by ID
router.get(
  '/getPeriodicPool/:id',
  authorize,
  PeriodicSavingController.getPeriodicSaving
);

// Stop a periodic saving
router.post(
  '/periodicPool/:id/stop',
  authorize,
  PeriodicSavingController.stopPeriodicSaving
);

// Resume a periodic saving
router.post(
  '/periodicPool/:id/resume',
  authorize,
  PeriodicSavingController.resumePeriodicSaving
);

// Update periodic saving amount
router.put(
  '/periodicPool/:id/amount',
  authorize,
  PeriodicSavingController.updateSavingAmount
);

// Execute a periodic saving manually
router.post(
  '/periodicPool/:id/execute',
  authorize,
  PeriodicSavingController.executePeriodicSaving
);
router.post(
  '/periodicPool/intialize',
  authorize,
  PeriodicSavingController.intializePeriodicSaving
);

export default router;
