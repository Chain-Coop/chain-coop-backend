import { Router } from "express";
import * as blogController from "../controllers/blogController";
import { authorize, authorizePermissions } from "../middlewares/authorization";

const router = Router();

router.get("/", blogController.getAllBlogPost);
router.get("/:id", blogController.getBlogPost);
router.post(
	"/",
	authorize,
	// authorizePermissions("admin"),
	blogController.createBlogPost
);
router.patch("/:id", blogController.updateBlogPost);
router.delete("/:id", blogController.deleteBlogPost);

export default router;
