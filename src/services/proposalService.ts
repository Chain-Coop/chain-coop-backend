import Proposal, { ProposalDocument } from "../models/proposalModel";
import { UploadApiResponse, v2 as cloudinary } from "cloudinary"; 

export const createProposalService = async (payload: any, file: any): Promise<ProposalDocument> => {
    let documentUrl = "";
    if (file) {
        const result: UploadApiResponse = await cloudinary.uploader.upload(file.tempFilePath, {
            folder: "proposals",
        });
        documentUrl = result.secure_url;
    }

    return await Proposal.create({ ...payload, documentUrl });
};

export const getUserProposalsService = async (userId: string): Promise<ProposalDocument[]> => {
    return await Proposal.find({ author: userId }).populate("author", "username email");
};

export const getAllProposalsService = async (): Promise<ProposalDocument[]> => {
    return await Proposal.find().populate("author", "username email");
};

export const getProposalByIdService = async (id: string): Promise<ProposalDocument | null> => {
    return await Proposal.findById(id).populate("author", "username email");
};

export const updateProposalByIdService = async (id: string, payload: any): Promise<ProposalDocument | null> => {
    return await Proposal.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
};

export const deleteProposalByIdService = async (id: string): Promise<void> => {
    await Proposal.findByIdAndDelete(id);
};
