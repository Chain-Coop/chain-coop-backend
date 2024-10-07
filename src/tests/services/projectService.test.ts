import {
  createProjectService,
  getUserProjectsService,
  getAllProjectsService,
  getProjectByIdService,
  updateProjectByIdService,
  deleteProjectByIdService,
  fundProjectService,
  updateProjectDetailsService,
} from '../../services/projectService';
import Project from '../../models/projectModel';
import Wallet from '../../models/wallet';
import { NotFoundError, ForbiddenError } from '../../errors';
import { v2 as cloudinary } from 'cloudinary';
import uploadImageFile from '../../utils/imageUploader';
import deleteDocument from '../../utils/deleteDocument';

jest.mock('../../models/projectModel');
jest.mock('../../models/wallet');
jest.mock('../../utils/imageUploader');
jest.mock('../../utils/deleteDocument');
jest.mock('cloudinary');

describe('Project Service Tests', () => {
  const userId = 'user123';
  const projectId = 'project123';
  const mockProject = {
      _id: projectId,
      author: userId,
      fundBalance: 0,
      documentUrl: 'old_document_url',
  };

  beforeEach(() => {
      jest.clearAllMocks(); // Clear mocks before each test
  });

  // Test for createProjectService
  it('should create a project with a document URL', async () => {
      const payload = { title: 'New Project', author: userId };
      const file = { tempFilePath: 'tempPath' };

      (cloudinary.uploader.upload as jest.Mock).mockResolvedValueOnce({
          secure_url: 'document_url',
      });
      
      (Project.create as jest.Mock).mockResolvedValueOnce(mockProject);
      
      const result = await createProjectService(payload, file);
      expect(result).toEqual(mockProject);
  });

  it('should create a project without a document URL', async () => {
      const payload = { title: 'New Project', author: userId };
      (Project.create as jest.Mock).mockResolvedValueOnce(mockProject);

      const result = await createProjectService(payload, null);
      expect(result).toEqual(mockProject);
  });

  // Test for getUserProjectsService
  it('should return all projects for a specific user', async () => {
      const mockProjects = [{ ...mockProject }];
      (Project.find as jest.Mock).mockResolvedValueOnce(mockProjects);

      const result = await getUserProjectsService(userId);
      expect(result).toEqual(mockProjects);
  });

  // Test for getAllProjectsService
  it('should return all projects', async () => {
      const mockProjects = [{ ...mockProject }];
      (Project.find as jest.Mock).mockResolvedValueOnce(mockProjects);

      const result = await getAllProjectsService();
      expect(result).toEqual(mockProjects);
  });

  // Test for getProjectByIdService
  it('should return a specific project by id', async () => {
      (Project.findById as jest.Mock).mockResolvedValueOnce(mockProject);

      const result = await getProjectByIdService(projectId);
      expect(result).toEqual(mockProject);
  });

  it('should return null for a non-existent project', async () => {
      (Project.findById as jest.Mock).mockResolvedValueOnce(null);

      const result = await getProjectByIdService('nonexistentId');
      expect(result).toBeNull();
  });

  // Test for updateProjectByIdService
  it('should update a project with a new document URL', async () => {
      const payload = { title: 'Updated Project' };
      (Project.findById as jest.Mock).mockResolvedValueOnce(mockProject);
      (Project.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce(mockProject);

      const result = await updateProjectByIdService(projectId, payload, { tempFilePath: 'tempPath' });
      expect(result).toEqual(mockProject);
  });

  it('should update a project without a new document URL', async () => {
      const payload = { title: 'Updated Project' };
      (Project.findById as jest.Mock).mockResolvedValueOnce(mockProject);
      (Project.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce(mockProject);

      const result = await updateProjectByIdService(projectId, payload);
      expect(result).toEqual(mockProject);
  });

  it('should return null for a non-existent project', async () => {
      (Project.findById as jest.Mock).mockResolvedValueOnce(null);

      const result = await updateProjectByIdService('nonexistentId', {});
      expect(result).toBeNull();
  });

  // Test for deleteProjectByIdService
  it('should delete a project by id and its document from Cloudinary', async () => {
      (Project.findById as jest.Mock).mockResolvedValueOnce(mockProject);
      (deleteDocument as jest.Mock).mockResolvedValueOnce(null);
      (Project.findByIdAndDelete as jest.Mock).mockResolvedValueOnce(mockProject);

      await deleteProjectByIdService(projectId);
      expect(Project.findByIdAndDelete).toHaveBeenCalledWith(projectId);
  });

  it('should handle deletion of a project that does not exist', async () => {
      (Project.findById as jest.Mock).mockResolvedValueOnce(null);

      await deleteProjectByIdService('nonexistentId');
      expect(Project.findByIdAndDelete).not.toHaveBeenCalled();
  });

  // Test for fundProjectService
  it('should fund a project successfully', async () => {
      const amount = 100;
      const mockWallet = { user: userId, balance: 200, save: jest.fn() };
      (Project.findById as jest.Mock).mockResolvedValueOnce(mockProject);
      (Wallet.findOne as jest.Mock).mockResolvedValueOnce(mockWallet);
      (Project.prototype.save as jest.Mock).mockResolvedValueOnce(mockProject);

      const result = await fundProjectService(userId, projectId, amount);
      expect(result).toEqual(mockProject);
      expect(mockWallet.balance).toBe(100); // Check updated wallet balance
  });

  it('should throw NotFoundError if the project does not exist', async () => {
      (Project.findById as jest.Mock).mockResolvedValueOnce(null);

      await expect(fundProjectService(userId, projectId, 100)).rejects.toThrow(NotFoundError);
  });

  it('should throw NotFoundError if the wallet does not exist', async () => {
      (Project.findById as jest.Mock).mockResolvedValueOnce(mockProject);
      (Wallet.findOne as jest.Mock).mockResolvedValueOnce(null);

      await expect(fundProjectService(userId, projectId, 100)).rejects.toThrow(NotFoundError);
  });

  it('should throw ForbiddenError if the wallet balance is insufficient', async () => {
      const mockWallet = { user: userId, balance: 50, save: jest.fn() };
      (Project.findById as jest.Mock).mockResolvedValueOnce(mockProject);
      (Wallet.findOne as jest.Mock).mockResolvedValueOnce(mockWallet);

      await expect(fundProjectService(userId, projectId, 100)).rejects.toThrow(ForbiddenError);
  });

  // Test for updateProjectDetailsService
  it('should update project details and upload an image', async () => {
      const updates = { title: 'Updated Title' };
      (Project.findById as jest.Mock).mockResolvedValueOnce(mockProject);
      (uploadImageFile as jest.Mock).mockResolvedValueOnce({ secure_url: 'new_image_url' });
      (Project.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce(mockProject);

      const result = await updateProjectDetailsService(projectId, userId, updates, { tempFilePath: 'imagePath' });
      expect(result).toEqual(mockProject);
  });

  it('should throw NotFoundError if the project does not exist', async () => {
      (Project.findById as jest.Mock).mockResolvedValueOnce(null);

      await expect(updateProjectDetailsService('nonexistentId', userId, {}, {})).rejects.toThrow(NotFoundError);
  });
});
