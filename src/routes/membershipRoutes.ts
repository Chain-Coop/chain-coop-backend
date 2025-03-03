import { Router } from "express";
import {
	activateMembership,
	getMembershipDetails,
	verifyPaymentCallback,
	//subscribe
} from "../controllers/membershipController";
import { authorize } from "../middlewares/authorization";

const router = Router();

router.post("/activate", authorize, activateMembership);
router.get("/verify-payment", verifyPaymentCallback);
//router.post("/subscribe", authorize, subscribe)


router.get("/details", authorize, getMembershipDetails);

export default router;
