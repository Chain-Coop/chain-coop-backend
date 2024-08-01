import { Request, Response } from "express";
import { ForbiddenError, NotFoundError } from "../errors";
import {
    createProposalService,
    getUserProposalsService,
    getAllProposalsService,
    getProposalByIdService,
    updateProposalByIdService,
    deleteProposalByIdService
} from "../services/proposalService";

// create a new proposal
export const createProposal = async (req: Request, res: Response) => {
    const { title, description } = req.body;
    const proposal = await createProposalService({
        title,
        description,
		// @ts-ignore
        author: req.user.userId, 
    });
    res.status(201).json({ msg: "Proposal created successfully", proposal });
};

// get all proposals for the logged-in user
export const getUserProposals = async (req: Request, res: Response) => {
		 // @ts-ignore
    const userId = req.user.userId;
    const proposals = await getUserProposalsService(userId);
    res.status(200).json(proposals);
};

// get all proposals (admin only)
export const getAllProposals = async (req: Request, res: Response) => {
    const proposals = await getAllProposalsService();
    res.status(200).json(proposals);
};

// get one proposal by id
export const getProposal = async (req: Request, res: Response) => {
    const { id } = req.params;
    const proposal = await getProposalByIdService(id);
    if (!proposal) {
        throw new NotFoundError("Proposal not found");
    }
    res.status(200).json(proposal);
};

// update a proposal by id
export const updateProposal = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, description, status } = req.body;
	// @ts-ignore
    const userId = req.user.userId; 

    const proposal = await getProposalByIdService(id);
    if (!proposal) {
        throw new NotFoundError("Proposal not found");
    }

    if (proposal.author.toString() !== userId) {
        throw new ForbiddenError("You are not authorized to update this proposal");
    }

    const updatedProposal = await updateProposalByIdService(id, { title, description, status, updatedDate: new Date() });
    res.status(200).json({ msg: "Proposal updated successfully", proposal: updatedProposal });
};

// delete a proposal by id (admin only)
export const deleteProposal = async (req: Request, res: Response) => {
    const { id } = req.params;
					// @ts-ignore
    const userId = req.user.userId; 
    const proposal = await getProposalByIdService(id);

    if (!proposal) {
        throw new NotFoundError("Proposal not found");
    }

    if (proposal.author.toString() !== userId) {
        throw new ForbiddenError("You are not authorized to delete this proposal");
    }

    await deleteProposalByIdService(id);
    res.status(200).json({ message: "Proposal deleted successfully" });
};
