// import { Router } from "express";
// import {
//   allowStableTokenAddressfForSaving,
//   setFeeCollectionAddress,
//   changeSavingContractOwnership,
//   unlistStableTokenAddressfForSaving,
// } from "../../../controllers/web3/chaincoopSaving/managementController";
// import { authorize } from "../../../middlewares/authorization";
// const router = Router();

// /**
//  * @swagger
//  * /web3/management/allow:
//  *   post:
//  *     summary: Allow a stable token address for saving
//  *     tags: [Web3]
//  *     security:
//  *       - bearerAuth: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               stableTokenAddress:
//  *                 type: string
//  *                 description: The stable token address to allow
//  *     responses:
//  *       200:
//  *         description: Success
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 message:
//  *                   type: string
//  *                   example: Success
//  *                 data:
//  *                   type: string
//  *                   example: transaction_hash
//  *       400:
//  *         description: Bad Request
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 message:
//  *                   type: string
//  *                   example: stableTokenAddress missing in body
//  *       500:
//  *         description: Internal Server Error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 message:
//  *                   type: string
//  *                   example: internal server error
//  */

// /**
//  * @swagger
//  * /web3/management/feeCollection:
//  *   post:
//  *     summary: Set fee collection address
//  *     tags: [Web3]
//  *     security:
//  *       - bearerAuth: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               feeCollectionAddress:
//  *                 type: string
//  *                 description: The fee collection address to set
//  *     responses:
//  *       200:
//  *         description: Success
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 message:
//  *                   type: string
//  *                   example: Success
//  *                 data:
//  *                   type: string
//  *                   example: transaction_hash
//  *       400:
//  *         description: Bad Request
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 message:
//  *                   type: string
//  *                   example: feeCollectionAddress missing in body
//  *       500:
//  *         description: Internal Server Error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 message:
//  *                   type: string
//  *                   example: internal server error
//  */

// /**
//  * @swagger
//  * /web3/management/changeOwnership:
//  *   post:
//  *     summary: Change saving contract ownership
//  *     tags: [Web3]
//  *     security:
//  *       - bearerAuth: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               newAdminAddress:
//  *                 type: string
//  *                 description: The new admin address
//  *     responses:
//  *       200:
//  *         description: Success
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 message:
//  *                   type: string
//  *                   example: Success
//  *                 data:
//  *                   type: string
//  *                   example: transaction_hash
//  *       400:
//  *         description: Bad Request
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 message:
//  *                   type: string
//  *                   example: newAdminAddress missing in body
//  *       500:
//  *         description: Internal Server Error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 message:
//  *                   type: string
//  *                   example: internal server error
//  */

// /**
//  * @swagger
//  * /web3/management/unlist:
//  *   post:
//  *     summary: Unlist a stable token address for saving
//  *     tags: [Web3]
//  *     security:
//  *       - bearerAuth: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               stableTokenAddress:
//  *                 type: string
//  *                 description: The stable token address to unlist
//  *     responses:
//  *       200:
//  *         description: Success
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 message:
//  *                   type: string
//  *                   example: Success
//  *                 data:
//  *                   type: string
//  *                   example: transaction_hash
//  *       400:
//  *         description: Bad Request
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 message:
//  *                   type: string
//  *                   example: stableTokenAddress missing in body
//  *       500:
//  *         description: Internal Server Error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 message:
//  *                   type: string
//  *                   example: internal server error
//  */

// router.post("/allow", authorize, allowStableTokenAddressfForSaving);
// router.post("/feeCollection", authorize, setFeeCollectionAddress);
// router.post("/changeOwnership", authorize, changeSavingContractOwnership);
// router.post("/unlist", authorize, unlistStableTokenAddressfForSaving);

// export default router;
