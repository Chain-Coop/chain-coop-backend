import { Router } from "express";
import * as blogController from "../controllers/blogController";
import { authorize, authorizePermissions } from "../middlewares/authorization";

const router = Router();

router.get("/", blogController.getAllBlogPost);
router.get("/:id", blogController.getBlogPost);
router.post("/comment/:id", blogController.createComment);

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
router.delete(
	"/comment/:commentId",
	authorize,
	authorizePermissions("admin"),
	blogController.deleteComment
);
router.post(
	"/category",
	authorize,
	authorizePermissions("admin"),
	blogController.createCategory
);

router.get("/category/get-all", blogController.getCategories);
router.patch(
	"/category/:categoryId",
	authorize,
	authorizePermissions("admin"),
	blogController.updateCategory
);
router.delete(
	"/category/:categoryId",
	authorize,
	authorizePermissions("admin"),
	blogController.deleteCategory
);

export default router;
