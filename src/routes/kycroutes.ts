import { Router } from "express";
import {
  sendOTP,
  setBVNController,
  verifyOTPController,
} from "../controllers/kycontroller";
import { authorize } from "../middlewares/authorization";

const router = Router();

router.post("/send-otp", authorize, sendOTP);
router.post("/verify-otp", authorize, verifyOTPController);
router.post("/set-bvn", authorize, setBVNController);

export default router;
