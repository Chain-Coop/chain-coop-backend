import { Router } from "express";
import {
    createProject,
    getUserProjects,
    getAllProjects,
    getProject,
    updateProject,
    deleteProject,
    fundProject
} from "../controllers/projectController";
import { authorize, authorizePermissions } from "../middlewares/authorization";

const router = Router();

// Route to create a project (admin only) and get user's projects
router
    .route("/")
    .post(authorize, authorizePermissions("admin"), createProject) // Only admins can create projects
    .get(authorize, getAllProjects); // Logged-in users can get their own projects

// Route to get all projects
router
    .route("/all-projects")
    .get(authorize, getAllProjects); // Anyone can view all projects

// Routes to get, update, and delete a specific project by ID
router
    .route("/:id")
    .get(authorize, getProject) // Any logged-in user can view a project by ID
    .patch(authorize, authorizePermissions("admin"), updateProject) // Only admins can update projects
    .delete(authorize, authorizePermissions("admin"), deleteProject); // Only admins can delete projects

// Route to fund a project (any logged-in user can fund)
router.post("/:id/fund", authorize, fundProject);

export default router;
