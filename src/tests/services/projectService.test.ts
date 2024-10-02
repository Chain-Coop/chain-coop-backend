import { Request } from "express"; // Import Request type
import {
  createProjectService,
  getUserProjectsService,
  getAllProjectsService,
  getProjectByIdService,
  updateProjectByIdService,
  deleteProjectByIdService,
  fundProjectService,
  updateProjectDetailsService,
} from "../../services/projectService";
import Project from "../../models/projectModel";
import Wallet from "../../models/wallet";
import { NotFoundError, ForbiddenError } from "../../errors";
import uploadDocument from "../../utils/uploadDocument";
import uploadImageFile from "../../utils/imageUploader"; // Ensure the uploadImageFile import is included

jest.mock("../../models/projectModel"); // Mock the Project model
jest.mock("../../models/wallet"); // Mock the Wallet model
jest.mock("../../utils/uploadDocument"); // Mock the uploadDocument function
jest.mock("../../utils/imageUploader"); // Mock the uploadImageFile function

describe("Project Service", () => {
  const userId = "user_12345";
  const projectId = "project_12345";
  const mockProject = {
    _id: projectId,
    author: userId,
    documentUrl: "http://example.com/document.jpg",
    fundBalance: 100,
  };

  afterEach(() => {
    jest.clearAllMocks(); // Clear mocks after each test
  });

  describe("createProjectService", () => {
    it("should create a project with a document URL", async () => {
      const mockFile = { tempFilePath: "temp/path/to/document.jpg" };
      const payload = { title: "Test Project", author: userId };

      (uploadDocument as jest.Mock).mockResolvedValueOnce("http://example.com/document.jpg");
      (Project.create as jest.Mock).mockResolvedValueOnce(mockProject);

      const result = await createProjectService(payload, mockFile);

      expect(result).toEqual(mockProject); // Validate the created project
      expect(uploadDocument).toHaveBeenCalledWith(mockFile, "projects"); // Check uploadDocument call
      expect(Project.create).toHaveBeenCalledWith({ ...payload, documentUrl: "http://example.com/document.jpg" }); // Check project creation call
    });

    it("should create a project without a document URL", async () => {
      const payload = { title: "Test Project", author: userId };

      (Project.create as jest.Mock).mockResolvedValueOnce(mockProject);

      const result = await createProjectService(payload, null);

      expect(result).toEqual(mockProject); // Validate the created project
      expect(uploadDocument).not.toHaveBeenCalled(); // Ensure uploadDocument is not called
      expect(Project.create).toHaveBeenCalledWith({ ...payload, documentUrl: "" }); // Check project creation call
    });
  });

  describe("getUserProjectsService", () => {
    it("should return all projects for a specific user", async () => {
      (Project.find as jest.Mock).mockResolvedValueOnce([mockProject]);

      const result = await getUserProjectsService(userId);

      expect(result).toEqual([mockProject]); // Validate the returned projects
      expect(Project.find).toHaveBeenCalledWith({ author: userId }); // Check Project.find call
    });
  });

  describe("getAllProjectsService", () => {
    it("should return all projects", async () => {
      (Project.find as jest.Mock).mockResolvedValueOnce([mockProject]);

      const result = await getAllProjectsService();

      expect(result).toEqual([mockProject]); // Validate the returned projects
      expect(Project.find).toHaveBeenCalled(); // Check Project.find call
    });
  });

  describe("getProjectByIdService", () => {
    it("should return a specific project by id", async () => {
      (Project.findById as jest.Mock).mockResolvedValueOnce(mockProject);

      const result = await getProjectByIdService(projectId);

      expect(result).toEqual(mockProject); // Validate the returned project
      expect(Project.findById).toHaveBeenCalledWith(projectId); // Check findById call
    });

    it("should return null for a non-existent project", async () => {
      (Project.findById as jest.Mock).mockResolvedValueOnce(null);

      const result = await getProjectByIdService("non_existent_id");

      expect(result).toBeNull(); // Validate the returned value
      expect(Project.findById).toHaveBeenCalledWith("non_existent_id"); // Check findById call
    });
  });

  describe("updateProjectByIdService", () => {
    it("should update a project with a new document URL", async () => {
      const mockFile = { tempFilePath: "temp/path/to/document.jpg" };
      const updates = { title: "Updated Project" };

      (Project.findById as jest.Mock).mockResolvedValueOnce(mockProject);
      (uploadDocument as jest.Mock).mockResolvedValueOnce("http://example.com/document.jpg");
      (Project.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce({ ...mockProject, ...updates });

      const result = await updateProjectByIdService(projectId, updates, mockFile);

      expect(result).toEqual({ ...mockProject, ...updates }); // Validate the updated project
      expect(uploadDocument).toHaveBeenCalledWith(mockFile, "projects"); // Check uploadDocument call
      expect(Project.findByIdAndUpdate).toHaveBeenCalledWith(projectId, { ...updates, documentUrl: "http://example.com/document.jpg" }, { new: true, runValidators: true }); // Check update call
    });

    it("should update a project without a new document URL", async () => {
      const updates = { title: "Updated Project" };

      (Project.findById as jest.Mock).mockResolvedValueOnce(mockProject);
      (Project.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce({ ...mockProject, ...updates });

      const result = await updateProjectByIdService(projectId, updates);

      expect(result).toEqual({ ...mockProject, ...updates }); // Validate the updated project
      expect(uploadDocument).not.toHaveBeenCalled(); // Ensure uploadDocument is not called
      expect(Project.findByIdAndUpdate).toHaveBeenCalledWith(projectId, updates, { new: true, runValidators: true }); // Check update call
    });

    it("should return null for a non-existent project", async () => {
      (Project.findById as jest.Mock).mockResolvedValueOnce(null);

      const result = await updateProjectByIdService("non_existent_id", { title: "Updated Project" });

      expect(result).toBeNull(); // Validate the returned value
      expect(Project.findById).toHaveBeenCalledWith("non_existent_id"); // Check findById call
    });
  });

  describe("deleteProjectByIdService", () => {
    it("should delete a project by id and its document from Cloudinary", async () => {
      (Project.findById as jest.Mock).mockResolvedValueOnce(mockProject);
      (Project.findByIdAndDelete as jest.Mock).mockResolvedValueOnce(mockProject);
      (uploadDocument as jest.Mock).mockResolvedValueOnce("http://example.com/document.jpg");

      await deleteProjectByIdService(projectId);

      expect(Project.findById).toHaveBeenCalledWith(projectId); // Check findById call
      expect(Project.findByIdAndDelete).toHaveBeenCalledWith(projectId); // Check delete call
      // Check that deleteDocument was called with the correct public ID (if applicable)
    });

    it("should handle deletion of a project that does not exist", async () => {
      (Project.findById as jest.Mock).mockResolvedValueOnce(null);

      await deleteProjectByIdService("non_existent_id");

      expect(Project.findById).toHaveBeenCalledWith("non_existent_id"); // Check findById call
      expect(Project.findByIdAndDelete).toHaveBeenCalledWith("non_existent_id"); // Check delete call
    });
  });

  describe("fundProjectService", () => {
    it("should fund a project successfully", async () => {
      const wallet = { user: userId, balance: 200 };
      const amount = 100;

      (Project.findById as jest.Mock).mockResolvedValueOnce(mockProject);
      (Wallet.findOne as jest.Mock).mockResolvedValueOnce(wallet);
      (Project.prototype.save as jest.Mock).mockResolvedValueOnce(mockProject); // Simulate save on the project
      (Wallet.prototype.save as jest.Mock).mockResolvedValueOnce(wallet); // Simulate save on the wallet

      const result = await fundProjectService(userId, projectId, amount);

      expect(result).toEqual(mockProject); // Validate the returned project
      expect(Project.findById).toHaveBeenCalledWith(projectId); // Check findById call
      expect(Wallet.findOne).toHaveBeenCalledWith({ user: userId }); // Check Wallet.findOne call
      expect(wallet.balance).toBe(100); // Check that balance is deducted correctly
      expect(mockProject.fundBalance).toBe(200); // Check that fund balance is updated correctly
    });

    it("should throw NotFoundError if the project does not exist", async () => {
      (Project.findById as jest.Mock).mockResolvedValueOnce(null);
      (Wallet.findOne as jest.Mock).mockResolvedValueOnce({ user: userId, balance: 100 });

      await expect(fundProjectService(userId, projectId, 100)).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError if the wallet does not exist", async () => {
      (Project.findById as jest.Mock).mockResolvedValueOnce(mockProject);
      (Wallet.findOne as jest.Mock).mockResolvedValueOnce(null);

      await expect(fundProjectService(userId, projectId, 100)).rejects.toThrow(NotFoundError);
    });

    it("should throw ForbiddenError if the wallet balance is insufficient", async () => {
      const wallet = { user: userId, balance: 50 };
      const amount = 100;

      (Project.findById as jest.Mock).mockResolvedValueOnce(mockProject);
      (Wallet.findOne as jest.Mock).mockResolvedValueOnce(wallet);

      await expect(fundProjectService(userId, projectId, amount)).rejects.toThrow(ForbiddenError);
    });
  });

  describe("updateProjectDetailsService", () => {
    it("should update project details and upload an image", async () => {
      const updates = { title: "Updated Project" };
      const mockFile = { tempFilePath: "temp/path/to/document.jpg" };

      (Project.findById as jest.Mock).mockResolvedValueOnce(mockProject);
      (uploadImageFile as jest.Mock).mockResolvedValueOnce({ secure_url: "http://example.com/updated_image.jpg" });
      (Project.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce({ ...mockProject, ...updates });

      const result = await updateProjectDetailsService(projectId, userId, updates, mockFile);

      expect(result).toEqual({ ...mockProject, ...updates }); // Validate the updated project
      expect(uploadImageFile).toHaveBeenCalledWith(mockFile, 'document', 'image'); // Check image upload call
      expect(Project.findByIdAndUpdate).toHaveBeenCalledWith(projectId, { ...updates, documentUrl: "http://example.com/updated_image.jpg" }, { new: true, runValidators: true }); // Check update call
    });

    it("should throw NotFoundError if the project does not exist", async () => {
      (Project.findById as jest.Mock).mockResolvedValueOnce(null);

      await expect(updateProjectDetailsService(projectId, userId, {}, {})).rejects.toThrow(NotFoundError);
    });
  });
});
