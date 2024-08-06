import { Request, Response } from "express";
import { createProjectService, getUserProjectsService } from "../services/projectService";

export const createProject = async (req: Request, res: Response) => {
  const { title, description } = req.body;
  // @ts-ignore - extract the userId from the authenticated user
  const userId = req.user.userId;

  const project = await createProjectService({ title, description, author: userId });
  res.status(201).json({ msg: "Project created successfully", project });
};

export const getUserProjects = async (req: Request, res: Response) => {
    // @ts-ignore 
  const userId = req.user.userId;
  const projects = await getUserProjectsService(userId);
  res.status(200).json(projects);
};