import {
    createProposalService,
    getUserProposalsService,
    getAllProposalsService,
    getProposalByIdService,
    updateProposalByIdService,
    deleteProposalByIdService,
  } from "../services/proposalService";
  import Proposal from "../models/proposalModel";
  import uploadDocument from "../utils/uploadDocument";
  import deleteDocument from "../utils/deleteDocument";
  import { UploadApiResponse } from "cloudinary";
  
  jest.mock("../models/proposalModel"); // Mock the Proposal model
  jest.mock("../utils/uploadDocument"); // Mock the uploadDocument function
  jest.mock("../utils/deleteDocument"); // Mock the deleteDocument function
  
  describe("Proposal Service", () => {
    const userId = "user_12345";
    const proposalId = "proposal_12345";
    const mockProposal = {
      _id: proposalId,
      author: userId,
      documentUrl: "http://example.com/document.jpg",
    };
  
    afterEach(() => {
      jest.clearAllMocks(); // Clear mocks after each test
    });
  
    describe("createProposalService", () => {
      it("should create a proposal with a document URL", async () => {
        const mockFile = { tempFilePath: "temp/path/to/document.jpg" };
        const payload = { title: "Test Proposal", author: userId };
  
        (uploadDocument as jest.Mock).mockResolvedValueOnce("http://example.com/document.jpg");
        (Proposal.create as jest.Mock).mockResolvedValueOnce(mockProposal);
  
        const result = await createProposalService(payload, mockFile);
  
        expect(result).toEqual(mockProposal); // Validate the created proposal
        expect(uploadDocument).toHaveBeenCalledWith(mockFile, "proposals"); // Check uploadDocument call
        expect(Proposal.create).toHaveBeenCalledWith({ ...payload, documentUrl: "http://example.com/document.jpg" }); // Check proposal creation call
      });
  
      it("should create a proposal without a document URL", async () => {
        const payload = { title: "Test Proposal", author: userId };
  
        (Proposal.create as jest.Mock).mockResolvedValueOnce(mockProposal);
  
        const result = await createProposalService(payload, null);
  
        expect(result).toEqual(mockProposal); // Validate the created proposal
        expect(uploadDocument).not.toHaveBeenCalled(); // Ensure uploadDocument is not called
        expect(Proposal.create).toHaveBeenCalledWith({ ...payload, documentUrl: "" }); // Check proposal creation call
      });
    });
  
    describe("getUserProposalsService", () => {
      it("should return all proposals for a specific user", async () => {
        (Proposal.find as jest.Mock).mockResolvedValueOnce([mockProposal]);
  
        const result = await getUserProposalsService(userId);
  
        expect(result).toEqual([mockProposal]); // Validate the returned proposals
        expect(Proposal.find).toHaveBeenCalledWith({ author: userId }); // Check Proposal.find call
      });
    });
  
    describe("getAllProposalsService", () => {
      it("should return all proposals", async () => {
        (Proposal.find as jest.Mock).mockResolvedValueOnce([mockProposal]);
  
        const result = await getAllProposalsService();
  
        expect(result).toEqual([mockProposal]); // Validate the returned proposals
        expect(Proposal.find).toHaveBeenCalled(); // Check Proposal.find call
      });
    });
  
    describe("getProposalByIdService", () => {
      it("should return a specific proposal by id", async () => {
        (Proposal.findById as jest.Mock).mockResolvedValueOnce(mockProposal);
  
        const result = await getProposalByIdService(proposalId);
  
        expect(result).toEqual(mockProposal); // Validate the returned proposal
        expect(Proposal.findById).toHaveBeenCalledWith(proposalId); // Check findById call
      });
  
      it("should return null for a non-existent proposal", async () => {
        (Proposal.findById as jest.Mock).mockResolvedValueOnce(null);
  
        const result = await getProposalByIdService("non_existent_id");
  
        expect(result).toBeNull(); // Validate the returned value
        expect(Proposal.findById).toHaveBeenCalledWith("non_existent_id"); // Check findById call
      });
    });
  
    describe("updateProposalByIdService", () => {
      it("should update a proposal with a new document URL", async () => {
        const mockFile = { tempFilePath: "temp/path/to/document.jpg" };
        const updates = { title: "Updated Proposal" };
  
        (Proposal.findById as jest.Mock).mockResolvedValueOnce(mockProposal);
        (uploadDocument as jest.Mock).mockResolvedValueOnce("http://example.com/updated_document.jpg");
        (Proposal.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce({ ...mockProposal, ...updates });
  
        const result = await updateProposalByIdService(proposalId, updates, mockFile);
  
        expect(result).toEqual({ ...mockProposal, ...updates }); // Validate the updated proposal
        expect(uploadDocument).toHaveBeenCalledWith(mockFile, "proposals"); // Check uploadDocument call
        expect(Proposal.findByIdAndUpdate).toHaveBeenCalledWith(proposalId, { ...updates, documentUrl: "http://example.com/updated_document.jpg" }, { new: true, runValidators: true }); // Check update call
      });
  
      it("should update a proposal without a new document URL", async () => {
        const updates = { title: "Updated Proposal" };
  
        (Proposal.findById as jest.Mock).mockResolvedValueOnce(mockProposal);
        (Proposal.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce({ ...mockProposal, ...updates });
  
        const result = await updateProposalByIdService(proposalId, updates);
  
        expect(result).toEqual({ ...mockProposal, ...updates }); // Validate the updated proposal
        expect(uploadDocument).not.toHaveBeenCalled(); // Ensure uploadDocument is not called
        expect(Proposal.findByIdAndUpdate).toHaveBeenCalledWith(proposalId, updates, { new: true, runValidators: true }); // Check update call
      });
  
      it("should return null for a non-existent proposal", async () => {
        (Proposal.findById as jest.Mock).mockResolvedValueOnce(null);
  
        const result = await updateProposalByIdService("non_existent_id", { title: "Updated Proposal" });
  
        expect(result).toBeNull(); // Validate the returned value
        expect(Proposal.findById).toHaveBeenCalledWith("non_existent_id"); // Check findById call
      });
    });
  
    describe("deleteProposalByIdService", () => {
      it("should delete a proposal by id and its document from Cloudinary", async () => {
        (Proposal.findById as jest.Mock).mockResolvedValueOnce(mockProposal);
        (Proposal.findByIdAndDelete as jest.Mock).mockResolvedValueOnce(mockProposal);
        
        await deleteProposalByIdService(proposalId);
  
        expect(Proposal.findById).toHaveBeenCalledWith(proposalId); // Check findById call
        expect(Proposal.findByIdAndDelete).toHaveBeenCalledWith(proposalId); // Check delete call
        // Check that deleteDocument was called with the correct public ID (if applicable)
      });
  
      it("should handle deletion of a proposal that does not exist", async () => {
        (Proposal.findById as jest.Mock).mockResolvedValueOnce(null);
  
        await deleteProposalByIdService("non_existent_id");
  
        expect(Proposal.findById).toHaveBeenCalledWith("non_existent_id"); // Check findById call
        expect(Proposal.findByIdAndDelete).toHaveBeenCalledWith("non_existent_id"); // Check delete call
      });
    });
  });
  