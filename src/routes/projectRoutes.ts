import { Router } from "express";
import {
    createProject,
    getUserProjects,
    getAllProjects,
    getProject,
    updateProject,
    deleteProject
} from "../controllers/projectController";
import { authorize, authorizePermissions } from "../middlewares/authorization";
import { fundProject } from "../controllers/projectController";

const router = Router();

router
    .route("/all-projects")
    .get(authorize, getAllProjects); // Get all projects (admin only)

router
    .route("/")
    .post(authorize, authorizePermissions("admin"), createProject) // Only admin can create projects
    //.get(authorize, getUserProjects); // Get projects for the logged-in user

router
    .route("/:id")
    .get(authorize, getProject) // Anyone logged in can view a project by ID
    .patch(authorize, authorizePermissions("admin"), updateProject) // Only admin can update projects
    .delete(authorize, authorizePermissions("admin"), deleteProject); // Only admin can delete projects

router.post("/:id/fund", authorize, fundProject);

export default router;
