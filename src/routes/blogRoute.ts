import { Router } from "express";
import * as blogController from "../controllers/blogController";
import { authorize, authorizePermissions } from "../middlewares/authorization";

const router = Router();

router.get("/", blogController.getAllBlogPost);
router.get("/:id", blogController.getBlogPost);
router.post(
	"/",
	authorize,
	authorizePermissions("admin"),
	blogController.createBlogPost
);
router.patch(
	"/:id",
	authorize,
	authorizePermissions("admin"),
	blogController.updateBlogPost
);
router.delete(
	"/:id",
	authorize,
	authorizePermissions("admin"),
	blogController.deleteBlogPost
);

export default router;
