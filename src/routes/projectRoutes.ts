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

const router = Router();

router
    .route("/")
    .post(authorize, createProject)
    .get(authorize, getUserProjects); // Get projects for the logged-in user

router
    .route("/admin")
    .get(authorize, authorizePermissions("admin"), getAllProjects); // Get all projects

router
    .route("/:id")
    .get(authorize, getProject)
    .patch(authorize, updateProject)
    .delete(authorize, deleteProject); // A logged-in user can delete a project they created

export default router;
