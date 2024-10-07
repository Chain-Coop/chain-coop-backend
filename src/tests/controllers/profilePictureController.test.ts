import request from 'supertest';
import express, { Request, Response } from 'express';
import { uploadProfilePicture } from '../../controllers/profilePictureController';
import { findUser } from '../../services/authService';
import { uploadProfilePicture as uploadProfilePicToCloudinary, deleteProfilePicture as deleteProfilePicFromCloudinary } from '../../services/profilePictureService';
import { StatusCodes } from 'http-status-codes';
import { NotFoundError } from '../../errors';

// Mock services
jest.mock('../../services/authService');
jest.mock('../../services/profilePictureService');

// Test express app
const app = express();
app.use(express.json());

// Route for testing
app.post('/profile/picture', uploadProfilePicture);

// Mock user ID for testing
const mockUserId = 'mockUserId';

// Middleware to mock authenticated user
app.use((req: Request, res: Response, next) => {
  // @ts-ignore
  req.user = { userId: mockUserId };
  next();
});

describe('Profile Picture Controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadProfilePicture', () => {
    test('should upload and update the profile picture successfully', async () => {
      const mockUploadedImage = { secure_url: 'mockUrl', public_id: 'mockImageId' };
      const mockUser = { profilePhoto: { imageId: 'oldImageId' }, save: jest.fn() };

      (uploadProfilePicToCloudinary as jest.Mock).mockResolvedValue(mockUploadedImage);
      (findUser as jest.Mock).mockResolvedValue(mockUser);
      (deleteProfilePicFromCloudinary as jest.Mock).mockResolvedValue(null);

      const response = await request(app).post('/profile/picture').send();

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.msg).toBe('Profile picture updated successfully.');
      expect(response.body.profilePhoto).toEqual({
        url: mockUploadedImage.secure_url,
        imageId: mockUploadedImage.public_id,
      });

      expect(uploadProfilePicToCloudinary).toHaveBeenCalledWith(expect.anything(), mockUserId);
      expect(findUser).toHaveBeenCalledWith('id', mockUserId);
      expect(deleteProfilePicFromCloudinary).toHaveBeenCalledWith(mockUser.profilePhoto.imageId);
      expect(mockUser.save).toHaveBeenCalled();
    });

    test('should return error if user not found', async () => {
      (findUser as jest.Mock).mockResolvedValue(null);

      const response = await request(app).post('/profile/picture').send();

      expect(response.status).toBe(StatusCodes.NOT_FOUND);
      expect(response.body.message).toBe('User not found.');
    });

    test('should handle Cloudinary upload failure', async () => {
      const mockError = new Error('Cloudinary upload failed');

      (uploadProfilePicToCloudinary as jest.Mock).mockRejectedValue(mockError);

      const response = await request(app).post('/profile/picture').send();

      expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(response.body.message).toBe('Cloudinary upload failed');
    });
  });
});
