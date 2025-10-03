import { Router } from "express";
import { setup2FA, verify2FASetup, disable2FA } from "../controllers/twoFactorController";
import { authorize } from "../middlewares/authorization";

const router = Router();


router.post("/setup", authorize, setup2FA);
router.post("/verify", authorize, verify2FASetup);
router.post("/disable", authorize, disable2FA);

export default router;