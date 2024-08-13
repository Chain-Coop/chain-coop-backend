import Proposal, { ProposalDocument } from "../models/proposalModel";
import { UploadApiResponse, v2 as cloudinary } from "cloudinary";
import deleteDocument from "../utils/deleteDocument";
import { extractPublicId } from "../utils/extractPublicId";
import uploadDocument from "../utils/uploadDocument";

// Create a new proposal service
export const createProposalService = async (
	payload: any,
	file: any
): Promise<ProposalDocument> => {
	let documentUrl = "";
	if (file) {
		// Upload the document to Cloudinary and get the secure URL
		documentUrl = await uploadDocument(file, "proposals");
	}

	return await Proposal.create({ ...payload, documentUrl });
};

// Get all proposals for a specific user 
export const getUserProposalsService = async (
	userId: string
): Promise<ProposalDocument[]> => {
	return await Proposal.find({ author: userId }).populate(
		"author",
		"username email"
	);
};

// Get all proposals (admin only)
export const getAllProposalsService = async (): Promise<ProposalDocument[]> => {
	return await Proposal.find().populate("author", "username email");
};

// Get a specific proposal by id 
export const getProposalByIdService = async (
	id: string
): Promise<ProposalDocument | null> => {
	return await Proposal.findById(id).populate("author", "username email");
};

// Update a specific proposal by id 
export const updateProposalByIdService = async (
	id: string,
	payload: any,
	file?: any
): Promise<ProposalDocument | null> => {
	if (file) {
		const proposal = await Proposal.findById(id);
		if (proposal && proposal.documentUrl) {
			const publicId = extractPublicId(proposal.documentUrl);
			if (publicId) {
				// Delete the old document from Cloudinary
				await deleteDocument(publicId);
			}
		}

		// Upload the new document to Cloudinary
		const result: UploadApiResponse = await cloudinary.uploader.upload(
			file.tempFilePath,
			{
				folder: "proposals",
			}
		);
		payload.documentUrl = result.secure_url;
	}

	return await Proposal.findByIdAndUpdate(id, payload, {
		new: true,
		runValidators: true,
	});
};

// Delete a specific proposal by id 
export const deleteProposalByIdService = async (id: string): Promise<void> => {
	const proposal = await Proposal.findById(id);
	if (proposal?.documentUrl) {
		// Delete the existing document from Cloudinary
		const publicId = extractPublicId(proposal.documentUrl);
		if (publicId) {
			await deleteDocument(publicId);
		}
	}

	await Proposal.findByIdAndDelete(id);
};
