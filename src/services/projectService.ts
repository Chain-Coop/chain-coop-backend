import Project, { ProjectDocument } from "../models/projectModel";
import { UploadApiResponse, v2 as cloudinary } from "cloudinary";
import deleteDocument from "../utils/deleteDocument";
import { extractPublicId } from "../utils/extractPublicId";
import uploadDocument from "../utils/uploadDocument";

// Create a new project service
export const createProjectService = async (
    payload: any,
    file: any
): Promise<ProjectDocument> => {
    let documentUrl = "";
    if (file) {
        try {
            documentUrl = await uploadDocument(file, "projects");
        } catch (error) {
            console.error("Error uploading document to Cloudinary:", error);
            throw new Error("Error uploading document");
        }
    }

    return await Project.create({ ...payload, documentUrl });
};

// Get all projects for a specific user 
export const getUserProjectsService = async (
    userId: string
): Promise<ProjectDocument[]> => {
    return await Project.find({ author: userId }).populate("author", "username email");
};

// Get all projects (admin only)
export const getAllProjectsService = async (): Promise<ProjectDocument[]> => {
    return await Project.find().populate("author", "username email");
};

// Get a specific project by id 
export const getProjectByIdService = async (
    id: string
): Promise<ProjectDocument | null> => {
    return await Project.findById(id).populate("author", "username email");
};

// Update a specific project by id 
export const updateProjectByIdService = async (
    id: string,
    payload: any,
    file?: any
): Promise<ProjectDocument | null> => {
    if (file) {
        const project = await Project.findById(id);
        if (project && project.documentUrl) {
            const publicId = extractPublicId(project.documentUrl);
            if (publicId) {
                try {
                    await deleteDocument(publicId);
                } catch (error) {
                    console.error("Error deleting old document from Cloudinary:", error);
                    throw new Error("Error deleting old document");
                }
            }
        }

        try {
            const result: UploadApiResponse = await cloudinary.uploader.upload(file.tempFilePath, {
                folder: "projects",
            });
            payload.documentUrl = result.secure_url;
        } catch (error) {
            console.error("Error uploading new document to Cloudinary:", error);
            throw new Error("Error uploading new document");
        }
    }

    return await Project.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
    });
};

// Delete a specific project by id 
export const deleteProjectByIdService = async (id: string): Promise<void> => {
    const project = await Project.findById(id);
    if (project?.documentUrl) {
        const publicId = extractPublicId(project.documentUrl);
        if (publicId) {
            try {
                await deleteDocument(publicId);
            } catch (error) {
                console.error("Error deleting document from Cloudinary:", error);
                throw new Error("Error deleting document");
            }
        }
    }

    await Project.findByIdAndDelete(id);
};
