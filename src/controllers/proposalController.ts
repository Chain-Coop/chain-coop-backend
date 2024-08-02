import { Request, Response } from "express";
import { ForbiddenError, NotFoundError } from "../errors";
import {
  createProposalService,
  getUserProposalsService,
  getAllProposalsService,
  getProposalByIdService,
  updateProposalByIdService,
  deleteProposalByIdService,
} from "../services/proposalService";

// Create a new proposal
export const createProposal = async (req: Request, res: Response) => {
  const { title, description } = req.body;
  // @ts-ignore - extract the userId from the authenticated user
  const userId = req.user.userId;
  const file = req.files?.document;

  const proposal = await createProposalService(
    {
      title,
      description,
      author: userId,
    },
    file
  );

  res.status(201).json({ msg: "Proposal created successfully", proposal });
};

// Get all proposals for the logged-in user
export const getUserProposals = async (req: Request, res: Response) => {
  // @ts-ignore 
  const userId = req.user.userId;
  const proposals = await getUserProposalsService(userId);
  res.status(200).json(proposals);
};

// Get all proposals 
export const getAllProposals = async (req: Request, res: Response) => {
  const proposals = await getAllProposalsService();
  res.status(200).json(proposals);
};

// Get a proposal by id
export const getProposal = async (req: Request, res: Response) => {
  const { id } = req.params;
  const proposal = await getProposalByIdService(id);
  if (!proposal) {
    throw new NotFoundError("Proposal not found");
  }
  res.status(200).json(proposal);
};

// Update a proposal by id
export const updateProposal = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, status } = req.body;
  // @ts-ignore
  const userId = req.user.userId;
  const file = req.files?.document; // get the uploaded document if available

  const proposal = await getProposalByIdService(id);
  if (!proposal) {
    throw new NotFoundError("Proposal not found");
  }

  // Check if the logged-in user is the author of the proposal
  if (proposal.author.toString() !== userId) {
    throw new ForbiddenError("You are not authorized to update this proposal");
  }

  const updatedProposal = await updateProposalByIdService(
    id,
    { title, description, status },
    file
  );

  res
    .status(200)
    .json({ msg: "Proposal updated successfully", proposal: updatedProposal });
};

// Delete a proposal by id
export const deleteProposal = async (req: Request, res: Response) => {
  const { id } = req.params;
  // @ts-ignore 
  const userId = req.user.userId;
  const proposal = await getProposalByIdService(id);
  if (!proposal) {
    throw new NotFoundError("Proposal not found");
  }

  // Check if the logged-in user is the author of the proposal
  if (proposal.author.toString() !== userId) {
    throw new ForbiddenError("You are not authorized to delete this proposal");
  }

  await deleteProposalByIdService(id);
  res.status(200).json({ message: "Proposal deleted successfully" });
};
