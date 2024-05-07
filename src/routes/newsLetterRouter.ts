import { Router } from "express";
import { joinWaitingList } from "../controllers/newsLetterController";
const router = Router();

router.post("/join", joinWaitingList);

export default router;
