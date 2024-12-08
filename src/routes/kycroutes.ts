import { Router } from "express";
import {
  sendOTP,
  setBVNController,
  verifyBVNController,
  verifyOTPController,
} from "../controllers/kycontroller";
import { authorize } from "../middlewares/authorization";

const router = Router();

router.post("/send-otp", authorize, sendOTP);
router.post("/verify-otp", authorize, verifyOTPController);
router.post("/set-bvn", authorize, setBVNController);
router.post("/verify-bvn", authorize, verifyBVNController);

export default router;
