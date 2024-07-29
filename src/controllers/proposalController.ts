import { Request, Response } from "express";
import Proposal from "../models/proposalModel";
import { NotFoundError } from "../errors";

export const createProposal = async (req: Request, res: Response) => {
  const { title, description } = req.body;
  const proposal = await Proposal.create({
    title,
    description,
    // @ts-ignore    
    author: req.user.userId,
  });
  res.status(201).json({ proposal });
};

export const getProposals = async (req: Request, res: Response) => {
  const proposals = await Proposal.find().populate("author", "username email");
  res.status(200).json({ proposals });
};

export const getProposal = async (req: Request, res: Response) => {
  const { id } = req.params;
  const proposal = await Proposal.findById(id).populate("author", "username email");
  if (!proposal) {
    throw new NotFoundError("Proposal not found");
  }
  res.status(200).json({ proposal });
};

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
  res.status(200).json({ proposal });
};

export const deleteProposal = async (req: Request, res: Response) => {
  const { id } = req.params;
  const proposal = await Proposal.findByIdAndDelete(id);
  if (!proposal) {
    throw new NotFoundError("Proposal not found");
  }
  res.status(200).json({ message: "Proposal deleted successfully" });
};
