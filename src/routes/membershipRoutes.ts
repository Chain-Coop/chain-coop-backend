import { Router } from "express";
import { activateMembership, getMembershipDetails } from "../controllers/membershipController";
import { authorize } from "../middlewares/authorization";

const router = Router();

router.post("/activate", authorize, activateMembership);
router.get("/details", authorize, getMembershipDetails);

export default router;
