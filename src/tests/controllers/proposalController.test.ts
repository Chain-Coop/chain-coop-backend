import request from 'supertest';
import express, { Request, Response } from 'express';
import {
  createProposal,
  getUserProposals,
  getAllProposals,
  getProposal,
  updateProposal,
  deleteProposal
} from '../../controllers/proposalController';
import {
  createProposalService,
  getUserProposalsService,
  getAllProposalsService,
  getProposalByIdService,
  updateProposalByIdService,
  deleteProposalByIdService
} from '../../services/proposalService';
import { ForbiddenError, NotFoundError } from '../../errors';

// Mock services
jest.mock('../../services/proposalService');

// Test express app
const app = express();
app.use(express.json());

// Middleware to mock authenticated user
app.use((req: Request, res: Response, next) => {
  // @ts-ignore
  req.user = { userId: 'mockUserId' };
  next();
});

// Routes for testing
app.post('/proposals', createProposal);
app.get('/proposals/user', getUserProposals);
app.get('/proposals', getAllProposals);
app.get('/proposals/:id', getProposal);
app.put('/proposals/:id', updateProposal);
app.delete('/proposals/:id', deleteProposal);

describe('Proposal Controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test for proposal creation
  // This test ensures a proposal is created successfully.
  describe('createProposal', () => {
    test('should create a new proposal successfully', async () => {
      const mockProposal = { id: 'mockProposalId', title: 'Test Proposal' };
      (createProposalService as jest.Mock).mockResolvedValue(mockProposal);

      const response = await request(app).post('/proposals').send({
        fullName: 'John Doe',
        title: 'Test Proposal',
        description: 'A sample proposal',
      });

      expect(response.status).toBe(201);
      expect(response.body.msg).toBe('Proposal created successfully');
      expect(response.body.proposal).toEqual(mockProposal);
    });
  });

  // Test for fetching user proposals
  // This test checks if all proposals for the logged-in user are returned.
  describe('getUserProposals', () => {
    test('should return all proposals for the user', async () => {
      const mockProposals = [{ id: '1', title: 'Proposal 1' }, { id: '2', title: 'Proposal 2' }];
      (getUserProposalsService as jest.Mock).mockResolvedValue(mockProposals);

      const response = await request(app).get('/proposals/user');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockProposals);
    });
  });

  // Test for fetching all proposals
  // This test ensures all proposals in the system are fetched.
  describe('getAllProposals', () => {
    test('should return all proposals', async () => {
      const mockProposals = [{ id: '1', title: 'Proposal 1' }, { id: '2', title: 'Proposal 2' }];
      (getAllProposalsService as jest.Mock).mockResolvedValue(mockProposals);

      const response = await request(app).get('/proposals');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockProposals);
    });
  });

  // Test for fetching a proposal by ID
  // This test ensures a specific proposal is retrieved by its ID, and handles errors if the proposal doesn't exist.
  describe('getProposal', () => {
    test('should return the proposal by ID', async () => {
      const mockProposal = { id: 'mockProposalId', title: 'Test Proposal' };
      (getProposalByIdService as jest.Mock).mockResolvedValue(mockProposal);

      const response = await request(app).get('/proposals/mockProposalId');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockProposal);
    });

    test('should return error if proposal not found', async () => {
      (getProposalByIdService as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/proposals/mockProposalId');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Proposal not found');
    });
  });

  // Test for updating a proposal
  // This test ensures a proposal is updated with new details and handles errors for unauthorized updates or missing proposals.
  describe('updateProposal', () => {
    test('should update the proposal successfully', async () => {
      const mockProposal = { id: 'mockProposalId', title: 'Updated Proposal' };
      (getProposalByIdService as jest.Mock).mockResolvedValue(mockProposal);
      (updateProposalByIdService as jest.Mock).mockResolvedValue(mockProposal);

      const response = await request(app).put('/proposals/mockProposalId').send({
        fullName: 'John Doe',
        description: 'Updated description',
        status: 'In Progress',
      });

      expect(response.status).toBe(200);
      expect(response.body.msg).toBe('Proposal updated successfully');
      expect(response.body.proposal).toEqual(mockProposal);
    });

    test('should return error if proposal not found', async () => {
      (getProposalByIdService as jest.Mock).mockResolvedValue(null);

      const response = await request(app).put('/proposals/mockProposalId').send({
        fullName: 'John Doe',
        description: 'Updated description',
      });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Proposal not found');
    });

    test('should return error if user is not the author', async () => {
      const mockProposal = { id: 'mockProposalId', title: 'Test Proposal', author: 'anotherUserId' };
      (getProposalByIdService as jest.Mock).mockResolvedValue(mockProposal);

      const response = await request(app).put('/proposals/mockProposalId').send({
        fullName: 'John Doe',
        description: 'Updated description',
      });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('You are not authorized to update this proposal');
    });
  });

  // Test for deleting a proposal
  // This test checks if a proposal is deleted and handles errors for unauthorized deletion or missing proposals.
  describe('deleteProposal', () => {
    test('should delete the proposal successfully', async () => {
      const mockProposal = { id: 'mockProposalId', title: 'Test Proposal' };
      (getProposalByIdService as jest.Mock).mockResolvedValue(mockProposal);
      (deleteProposalByIdService as jest.Mock).mockResolvedValue(null);

      const response = await request(app).delete('/proposals/mockProposalId');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Proposal deleted successfully');
    });

    test('should return error if proposal not found', async () => {
      (getProposalByIdService as jest.Mock).mockResolvedValue(null);

      const response = await request(app).delete('/proposals/mockProposalId');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Proposal not found');
    });

    test('should return error if user is not the author', async () => {
      const mockProposal = { id: 'mockProposalId', title: 'Test Proposal', author: 'anotherUserId' };
      (getProposalByIdService as jest.Mock).mockResolvedValue(mockProposal);

      const response = await request(app).delete('/proposals/mockProposalId');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('You are not authorized to delete this proposal');
    });
  });
});
