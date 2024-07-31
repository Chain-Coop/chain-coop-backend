import { Request, Response } from "express";
import Proposal from "../models/proposalModel";
import { ForbiddenError, NotFoundError } from "../errors";

// create a new proposal
export const createProposal = async (req: Request, res: Response) => {
	const { title, description } = req.body;
	const proposal = await Proposal.create({
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
	const proposals = await Proposal.find({ author: userId }).populate(
		"author",
		"username email"
	);
	res.status(200).json(proposals);
};

// get all proposals (admin only)
export const getAllProposals = async (req: Request, res: Response) => {
	const proposals = await Proposal.find().populate("author", "username email");
	res.status(200).json(proposals);
};

// get a one proposal by id
export const getProposal = async (req: Request, res: Response) => {
	const { id } = req.params;
	const proposal = await Proposal.findById(id).populate(
		"author",
		"username email"
	);
	if (!proposal) {
		throw new NotFoundError("Proposal not found");
	}
	res.status(200).json(proposal);
};

// update a proposal by id
export const updateProposal = async (req: Request, res: Response) => {
	const { id } = req.params;
	const { title, description, status } = req.body;
	const proposal = await Proposal.findByIdAndUpdate(
		id,
		{ title, description, status, updatedDate: new Date() },
		{ new: true, runValidators: true }
	);
	if (!proposal) {
		throw new NotFoundError("Proposal not found");
	}
	res.status(200).json({ msg: "Proposal updated successfully", proposal });
};

// delete a proposal by id (admin only)
export const deleteProposal = async (req: Request, res: Response) => {
	const { id } = req.params;
	//@ts-ignore
	const userId = req.user.userId;
	const proposal = await Proposal.findById(id);

	if (!proposal) {
		throw new NotFoundError("Proposal not found");
	}

	if (proposal.author.toString() !== userId) {
		throw new ForbiddenError("You are not authorized to delete this proposal");
	}
	await Proposal.findByIdAndDelete(id);

	res.status(200).json({ message: "Proposal deleted successfully" });
};
