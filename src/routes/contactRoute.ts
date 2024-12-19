import { Router } from "express";
import {
	createContactMsg,
	getContacts,
	createContactMsgLoggedIn
} from "../controllers/contactController";
import { authorize, authorizePermissions } from "../middlewares/authorization";
const router = Router();

router.post("/", createContactMsg);
router.get("/", authorize, authorizePermissions("admin"), getContacts);

// route for logged-in users (no phone number required)
router.post("/logged-in", authorize, createContactMsgLoggedIn);


export default router;
