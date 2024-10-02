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
} from "../services/projectService";
import fs from 'fs';
import { StatusCodes } from "http-status-codes";
import { BadRequestError } from "../errors"; 

// Create a new project
export const createProject = async (req: Request, res: Response) => {
    const { title, description, projectPrice, } = req.body;
    // @ts-ignore - extract the userId from the authenticated user
    const userId = req.user.userId;
    const file = req.files?.document;

    try {
        const project = await createProjectService(
            {
                title,
                description,
                projectPrice,
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
	const { title, description, status, projectPrice } = req.body;
	// @ts-ignore
	const userId = req.user.userId;
	const file = req.files?.document; 

    const project = await getProjectByIdService(id);
    if (!project) {
        throw new NotFoundError("Project not found");
    }

    const updatedProject = await updateProjectByIdService(
        id,
        { title, description, status, projectPrice },
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
        
        return res.status(StatusCodes.OK).json({
            statusCode: StatusCodes.OK,
            message: "Project funded successfully",
            project
        });
    } catch (error) {
        console.error(error);
    
        // @ts-ignore
        return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
            // @ts-ignore
            statusCode: error?.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
            // @ts-ignore
            error: error?.message
        });
    }
};


