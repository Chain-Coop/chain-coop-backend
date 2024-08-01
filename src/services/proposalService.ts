import Proposal, { ProposalDocument } from "../models/proposalModel";

export const createProposalService = async (payload: any): Promise<ProposalDocument> => {
    return await Proposal.create(payload);
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
