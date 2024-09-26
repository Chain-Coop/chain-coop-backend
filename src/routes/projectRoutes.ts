import { Router } from "express";
import {
    createProject,
    getUserProjects,
    getAllProjects,
    getProject,
    updateProject,
    deleteProject,
    updateProjectDetails
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
    .get(authorize, getUserProjects); // Get projects for the logged-in user

router
    .route("/:id")
    .get(authorize, getProject) // Anyone logged in can view a project by ID
    .delete(authorize, authorizePermissions("admin"), deleteProject); // Only admin can delete project

router
    .route("/:id/update")
    .patch(authorize, authorizePermissions("admin"), updateProjectDetails); // Only admin can update projects


router.post("/:id/fund", authorize, fundProject);

export default router;
