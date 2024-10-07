import request from 'supertest';
import express, { Request, Response } from 'express';
import {
	createProject,
	getUserProjects,
	getAllProjects,
	getProject,
	updateProject,
	deleteProject,
	fundProject
} from '../../controllers/projectController';
import {
	createProjectService,
	getUserProjectsService,
	getAllProjectsService,
	getProjectByIdService,
	updateProjectByIdService,
	deleteProjectByIdService,
	fundProjectService
} from '../../services/projectService';
import { NotFoundError } from '../../errors';
import { StatusCodes } from 'http-status-codes';
import fs from 'fs';

// Mock services
jest.mock('../../services/projectService');

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
app.post('/projects', createProject);
app.get('/projects/user', getUserProjects);
app.get('/projects', getAllProjects);
app.get('/projects/:id', getProject);
app.put('/projects/:id', updateProject);
app.delete('/projects/:id', deleteProject);
app.post('/projects/:id/fund', fundProject);

describe('Project Controller', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	// Test for project creation
	// This test ensures that a project is successfully created with the provided details.
	describe('createProject', () => {
		test('should create a new project successfully', async () => {
			const mockProject = { id: 'mockProjectId', title: 'Test Project' };
			(createProjectService as jest.Mock).mockResolvedValue(mockProject);

			const response = await request(app).post('/projects').send({
				title: 'Test Project',
				description: 'A sample project',
				projectPrice: 1000,
			});

			expect(response.status).toBe(StatusCodes.CREATED);
			expect(response.body.message).toBe('Project created successfully');
			expect(response.body.project).toEqual(mockProject);
			expect(createProjectService).toHaveBeenCalledWith(
				{
					title: 'Test Project',
					description: 'A sample project',
					projectPrice: 1000,
					author: 'mockUserId',
				},
				undefined // No file is uploaded
			);
		});
	});

	// Test for fetching user projects
	// This test checks if all the projects for a specific user are returned successfully.
	describe('getUserProjects', () => {
		test('should return all projects for the user', async () => {
			const mockProjects = [{ id: '1', title: 'Project 1' }, { id: '2', title: 'Project 2' }];
			(getUserProjectsService as jest.Mock).mockResolvedValue(mockProjects);

			const response = await request(app).get('/projects/user');

			expect(response.status).toBe(StatusCodes.OK);
			expect(response.body).toEqual(mockProjects);
			expect(getUserProjectsService).toHaveBeenCalledWith('mockUserId');
		});
	});

	// Test for fetching all projects
	// This test ensures that all projects in the system are retrieved successfully.
	describe('getAllProjects', () => {
		test('should return all projects', async () => {
			const mockProjects = [{ id: '1', title: 'Project 1' }, { id: '2', title: 'Project 2' }];
			(getAllProjectsService as jest.Mock).mockResolvedValue(mockProjects);

			const response = await request(app).get('/projects');

			expect(response.status).toBe(StatusCodes.OK);
			expect(response.body).toEqual(mockProjects);
		});
	});

	// Test for fetching a project by ID
	// This test checks if a specific project is retrieved by its ID, and returns an error if the project doesn't exist.
	describe('getProject', () => {
		test('should return the project by ID', async () => {
			const mockProject = { id: 'mockProjectId', title: 'Test Project' };
			(getProjectByIdService as jest.Mock).mockResolvedValue(mockProject);

			const response = await request(app).get('/projects/mockProjectId');

			expect(response.status).toBe(StatusCodes.OK);
			expect(response.body).toEqual(mockProject);
		});

		test('should return error if project not found', async () => {
			(getProjectByIdService as jest.Mock).mockResolvedValue(null);

			const response = await request(app).get('/projects/mockProjectId');

			expect(response.status).toBe(StatusCodes.NOT_FOUND);
			expect(response.body.message).toBe('Project not found');
		});
	});

	// Test for updating a project
	// This test ensures that a project is successfully updated with new details, and checks for errors if the project doesn't exist.
	describe('updateProject', () => {
		test('should update the project successfully', async () => {
			const mockProject = { id: 'mockProjectId', title: 'Updated Project' };
			(updateProjectByIdService as jest.Mock).mockResolvedValue(mockProject);
			(getProjectByIdService as jest.Mock).mockResolvedValue(mockProject);

			const response = await request(app).put('/projects/mockProjectId').send({
				title: 'Updated Project',
				description: 'Updated description',
				projectPrice: 2000,
			});

			expect(response.status).toBe(StatusCodes.OK);
			expect(response.body.msg).toBe('Project updated successfully');
			expect(response.body.project).toEqual(mockProject);
		});

		test('should return error if project not found', async () => {
			(getProjectByIdService as jest.Mock).mockResolvedValue(null);

			const response = await request(app).put('/projects/mockProjectId').send({
				title: 'Updated Project',
			});

			expect(response.status).toBe(StatusCodes.NOT_FOUND);
			expect(response.body.message).toBe('Project not found');
		});
	});

	// Test for deleting a project
	// This test checks if a project is successfully deleted, and returns an error if the project doesn't exist.
	describe('deleteProject', () => {
		test('should delete the project successfully', async () => {
			const mockProject = { id: 'mockProjectId', title: 'Test Project' };
			(getProjectByIdService as jest.Mock).mockResolvedValue(mockProject);
			(deleteProjectByIdService as jest.Mock).mockResolvedValue(null);

			const response = await request(app).delete('/projects/mockProjectId');

			expect(response.status).toBe(StatusCodes.OK);
			expect(response.body.message).toBe('Project deleted successfully');
		});

		test('should return error if project not found', async () => {
			(getProjectByIdService as jest.Mock).mockResolvedValue(null);

			const response = await request(app).delete('/projects/mockProjectId');

			expect(response.status).toBe(StatusCodes.NOT_FOUND);
			expect(response.body.message).toBe('Project not found');
		});
	});

	// Test for funding a project
	// This test ensures that a project is funded successfully, or returns an error if funding fails.
	describe('fundProject', () => {
		test('should fund the project successfully', async () => {
			const mockProject = { id: 'mockProjectId', title: 'Funded Project' };
			(fundProjectService as jest.Mock).mockResolvedValue(mockProject);

			const response = await request(app).post('/projects/mockProjectId/fund').send({
				amount: 500,
			});

			expect(response.status).toBe(StatusCodes.OK);
			expect(response.body.msg).toBe('Project funded successfully');
			expect(response.body.project).toEqual(mockProject);
		});

		test('should return error if funding fails', async () => {
			const mockError = new Error('Funding failed');
			(fundProjectService as jest.Mock).mockRejectedValue(mockError);

			const response = await request(app).post('/projects/mockProjectId/fund').send({
				amount: 500,
			});

			expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
			expect(response.body.error).toBe('Funding failed');
		});
	});
});
