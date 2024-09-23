import Project, { ProjectDocument } from "../models/projectModel";
import Wallet from "../models/wallet";
import { UploadApiResponse, v2 as cloudinary } from "cloudinary";
import deleteDocument from "../utils/deleteDocument";
import { extractPublicId } from "../utils/extractPublicId";
import uploadDocument from "../utils/uploadDocument";
import { ForbiddenError, NotFoundError } from "../errors"; 
import uploadImageFile from "../utils/imageUploader"; 

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

export const fundProjectService = async (
    userId: string,
    projectId: string,
    amount: number
): Promise<ProjectDocument | null> => {
    const project = await Project.findById(projectId);
    if (!project) {
        throw new NotFoundError("Project not found");
    }

    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
        throw new NotFoundError("Wallet not found");
    }

    if (wallet.balance < amount) {
        throw new ForbiddenError("Insufficient balance in wallet");
    }

    // Deduct the amount from the user's wallet
    wallet.balance -= amount;
    await wallet.save();

    // Add the amount to the project's fund balance
    project.fundBalance += amount;
    await project.save();

    return project;
};

export const updateProjectDetailsService = async (
    id: string,
    userId: string,
    updates: any,
    file: any
): Promise<ProjectDocument | null> => {
    // Fetch the project by its ID
    const project = await getProjectByIdService(id);

    // Check if the project is null and throw an appropriate error
    if (!project) {
        throw new NotFoundError("Project not found");
    }

 

    // Handle file upload if provided
    if (file) {
        const uploadedImage = await uploadImageFile(file, 'document', 'image');
        updates.documentUrl = uploadedImage.secure_url; // Update the document URL with the uploaded image
    }

    // Update the project details
    return await Project.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true,
    });
};