import { Router } from "express";
import {
	createContactMsg,
	getContacts,
} from "../controllers/contactController";
import { authorize, authorizePermissions } from "../middlewares/authorization";
const router = Router();

router.post("/", createContactMsg);
router.get(
	"/",
	authorize,
	// authorizePermissions("admin"),
	getContacts
);

export default router;
