import { Router } from "express";
import { createProject, getUserProjects } from "../controllers/projectController";

const router = Router();

router.post("/create", createProject);
router.get("/user", getUserProjects);

export default router;