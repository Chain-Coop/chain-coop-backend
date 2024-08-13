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
        // Upload the document to Cloudinary and get the secure URL
        documentUrl = await uploadDocument(file, "projects");
    }

    return await Project.create({ ...payload, documentUrl });
};

// Get all projects for a specific user 
export const getUserProjectsService = async (
    userId: string
): Promise<ProjectDocument[]> => {
    return await Project.find({ author: userId }).populate(
        "author",
        "username email"
    );
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
                // Delete the old document from Cloudinary
                await deleteDocument(publicId);
            }
        }

        // Upload the new document to Cloudinary
        const result: UploadApiResponse = await cloudinary.uploader.upload(
            file.tempFilePath,
            {
                folder: "projects",
            }
        );
        payload.documentUrl = result.secure_url;
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
        // Delete the existing document from Cloudinary
        const publicId = extractPublicId(project.documentUrl);
        if (publicId) {
            await deleteDocument(publicId);
        }
    }

    await Project.findByIdAndDelete(id);
};
