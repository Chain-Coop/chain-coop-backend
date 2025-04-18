import { Router } from "express";
import {
  createProject,
  getUserProjects,
  getAllProjects,
  getProject,
  updateProject,
  deleteProject,
  getUserFundedProjects,
} from "../controllers/projectController";
import { authorize, authorizePermissions } from "../middlewares/authorization";
import { fundProject } from "../controllers/projectController";

const router = Router();

router.route("/all-projects").get(authorize, getAllProjects); // Get all projects (admin only)

router.get("/funded", authorize, getUserFundedProjects);

router
  .route("/")
  .post(authorize, authorizePermissions("admin"), createProject) // Only admin can create projects
  .get(authorize, getUserProjects); // Get projects for the logged-in user

router.route("/:id").get(authorize, getProject); // anyone logged in can view a project by ID

router
  .route("/:id/update_project")
  .patch(authorize, authorizePermissions("admin"), updateProject); // Only admin can update projects

router
  .route("/:id/delete_project")
  .delete(authorize, authorizePermissions("admin"), deleteProject); // Only admin can delete projects

router.post("/:id/fund", authorize, fundProject);

export default router;
