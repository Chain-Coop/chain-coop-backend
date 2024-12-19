import { Router } from "express";
import { uploadProfilePicture } from "../controllers/profilePictureController";
import { authorize } from "../middlewares/authorization";

const router = Router();

router.post("/upload_profile_picture", authorize, uploadProfilePicture);

export default router;
