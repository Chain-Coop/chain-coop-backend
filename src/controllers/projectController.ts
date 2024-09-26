import { Request, Response } from "express";
import { ForbiddenError, NotFoundError } from "../errors";
import {
    createProjectService,
    getUserProjectsService,
    getAllProjectsService,
    getProjectByIdService,
    updateProjectByIdService,
    deleteProjectByIdService,
    fundProjectService,
    updateProjectDetailsService,
} from "../services/projectService";
import fs from 'fs';
import { StatusCodes } from "http-status-codes";
import { BadRequestError } from "../errors"; // Import your custom error

// Create a new project
export const createProject = async (req: Request, res: Response) => {
    const { title, description } = req.body;
    // @ts-ignore - extract the userId from the authenticated user
    const userId = req.user.userId;
    const file = req.files?.document;

    // Only allow admins to create projects
     //@ts-ignore
    if (!req.user.isAdmin) {
        throw new ForbiddenError("Only admins can create projects");
    }

    try {
        const project = await createProjectService(
            {
                title,
                description,
                author: userId,
            },
            file
        );

        return res.status(StatusCodes.CREATED).json({
            statusCode: StatusCodes.CREATED,
            message: "Project created successfully",
            project,
        });
    } catch (error) {
        console.error(error);
        res.status(
            error instanceof BadRequestError
                ? StatusCodes.BAD_REQUEST
                : StatusCodes.INTERNAL_SERVER_ERROR
        ).json({
            statusCode: error instanceof BadRequestError
                ? StatusCodes.BAD_REQUEST
                : StatusCodes.INTERNAL_SERVER_ERROR,
            error: (error as Error).message,
        });
    }
};

// Get all projects for the logged-in user
export const getUserProjects = async (req: Request, res: Response) => {
    // @ts-ignore
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
    // @ts-ignore
    const userId = req.user.userId;
    const file = req.files?.document; // Get the uploaded document if available

    const project = await getProjectByIdService(id);
    if (!project) {
        throw new NotFoundError("Project not found");
    }

    // Only allow admins to update projects
     //@ts-ignore
    if (!req.user.isAdmin) {
        throw new ForbiddenError("Only admins can update projects");
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
    // @ts-ignore
    const userId = req.user.userId;
    const project = await getProjectByIdService(id);
    if (!project) {
        throw new NotFoundError("Project not found");
    }

    // Only allow admins to delete projects
     //@ts-ignore
    if (!req.user.isAdmin) {
        throw new ForbiddenError("Only admins can delete projects");
    }

    await deleteProjectByIdService(id);
    res.status(200).json({ message: "Project deleted successfully" });
};

export const fundProject = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { amount } = req.body; 
    // @ts-ignore 
    const userId = req.user.userId;

    try {
        const project = await fundProjectService(userId, id, amount);
        res.status(200).json({ msg: "Project funded successfully", project });
    } catch (error) {
        //@ts-ignore
        res.status(error.statusCode || 500).json({ error: error.message });
    }
};

export const updateProjectDetails = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, description, status } = req.body;
    // @ts-ignore
    const userId = req.user.userId;

    // Prepare updates
    const updates: any = {};
    if (title) updates.title = title;
    if (description) updates.description = description;
    if (status) updates.status = status;

    // Only allow admins to update project details
    //@ts-ignore
    if (!req.user.isAdmin) {
        throw new ForbiddenError("Only admins can update project details");
    }

    // Call the service to update project details
    try {
        const updatedProject = await updateProjectDetailsService(id, userId, updates, req.files?.document);
        res.status(200).json({ msg: "Project details updated successfully", project: updatedProject });
    } catch (error) {
        //@ts-ignore
        res.status(error.statusCode || 500).json({ error: error.message });
    }
};
