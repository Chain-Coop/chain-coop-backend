import { Request, Response } from "express";
import { ForbiddenError, NotFoundError } from "../errors";
import {
    createProjectService,
    getUserProjectsService,
    getAllProjectsService,
    getProjectByIdService,
    updateProjectByIdService,
    deleteProjectByIdService,
} from "../services/projectService";
import fs from 'fs';

// Create a new project
export const createProject = async (req: Request, res: Response) => {
    const { title, description } = req.body;
    // @ts-ignore - extract the userId from the authenticated user
    const userId = req.user.userId;
    const file = req.files?.document;

    const project = await createProjectService(
        {
            title,
            description,
            author: userId,
        },
        file
    );

    // Delete the temporary file
	//@ts-ignore
    if (file && file.tempFilePath) {
			//@ts-ignore
        fs.unlink(file.tempFilePath, (err) => {
            if (err) console.error('Failed to delete temp file:', err);
        });
    }

    res.status(201).json({ msg: "Project created successfully", project });
};

// Get all projects for the logged-in user
export const getUserProjects = async (req: Request, res: Response) => {
		//@ts-ignore
    const userId = req.user.userId;
    const projects = await getUserProjectsService(userId);
    res.status(200).json(projects);
};

// Get all projects
export const getAllProjects = async (req: Request, res: Response) => {
    const projects = await getAllProjectsService();
    res.status(200).json(projects);
};

// Get a project by id
export const getProject = async (req: Request, res: Response) => {
    const { id } = req.params;
    const project = await getProjectByIdService(id);
    if (!project) {
        throw new NotFoundError("Project not found");
    }
    res.status(200).json(project);
};

// Update a project by id
export const updateProject = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, description, status } = req.body;
		//@ts-ignore
    const userId = req.user.userId;
    const file = req.files?.document;

    const project = await getProjectByIdService(id);
    if (!project) {
        throw new NotFoundError("Project not found");
    }

    // Check if the logged-in user is the author of the project
    if (project.author.toString() !== userId) {
        throw new ForbiddenError("You are not authorized to update this project");
    }

    const updatedProject = await updateProjectByIdService(
        id,
        { title, description, status },
        file
    );

    // Delete the temporary file
		//@ts-ignore
    if (file && file.tempFilePath) {
			//@ts-ignore
        fs.unlink(file.tempFilePath, (err) => {
            if (err) console.error('Failed to delete temp file:', err);
        });
    }

    res
        .status(200)
        .json({ msg: "Project updated successfully", project: updatedProject });
};

// Delete a project by id
export const deleteProject = async (req: Request, res: Response) => {
    const { id } = req.params;
		//@ts-ignore
    const userId = req.user.userId;
    const project = await getProjectByIdService(id);
    if (!project) {
        throw new NotFoundError("Project not found");
    }

    // Check if the logged-in user is the author of the project
    if (project.author.toString() !== userId) {
        throw new ForbiddenError("You are not authorized to delete this project");
    }

    await deleteProjectByIdService(id);
    res.status(200).json({ message: "Project deleted successfully" });
};
