import request from 'supertest';
import express from 'express';
import { joinWaitingList } from '../../controllers/newsLetterController';
import { addUserService, findNewsLetterUser } from '../../services/newsLetterService';
import { sendEmail } from '../../utils/sendEmail';
import { StatusCodes } from 'http-status-codes';
import { BadRequestError } from '../../errors';

// Mock services
jest.mock('../../services/newsLetterService');
jest.mock('../../utils/sendEmail');

// Test express app
const app = express();
app.use(express.json());

// Route for testing
app.post('/newsletter/join', joinWaitingList);

describe('joinWaitingList Controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should add user to the waitlist and send email', async () => {
    // Mocking service responses
    (findNewsLetterUser as jest.Mock).mockResolvedValue(false);
    (addUserService as jest.Mock).mockResolvedValue(true);
    (sendEmail as jest.Mock).mockResolvedValue(true);

    const response = await request(app)
      .post('/newsletter/join')
      .send({
        email: 'test@example.com',
        name: 'John Doe',
      });

    expect(response.status).toBe(StatusCodes.CREATED);
    expect(response.body.msg).toBe(
      'You have been successfully added to the waiting list and will get notified'
    );
    expect(findNewsLetterUser).toHaveBeenCalledWith('test@example.com');
    expect(addUserService).toHaveBeenCalledWith({ email: 'test@example.com', name: 'John Doe' });
    expect(sendEmail).toHaveBeenCalled();
  });

  test(
    'should return error if user is already on the waitlist',
    async () => {
      (findNewsLetterUser as jest.Mock).mockResolvedValueOnce(true); // User is already registered

      const response = await request(app)
        .post('/newsletter/join')
        .send({
          email: 'test@example.com',
          name: 'John Doe',
        });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.error).toBe('You have already joined the waitlist');
      expect(findNewsLetterUser).toHaveBeenCalledWith('test@example.com');
      expect(addUserService).not.toHaveBeenCalled();
      expect(sendEmail).not.toHaveBeenCalled();
    },
    10000 // Reducing timeout to 10 seconds (if test exceeds this, there's likely an issue)
  );

  test(
    'should handle service errors gracefully',
    async () => {
      // Simulate a service failure (e.g., DB error or other rejection)
      (findNewsLetterUser as jest.Mock).mockRejectedValueOnce(new Error('Mock Error'));

      const response = await request(app)
        .post('/newsletter/join')
        .send({
          email: 'test@example.com',
          name: 'John Doe',
        });

      expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(response.body.error).toBe('An error occurred while processing your request.');
    },
    10000 // Reducing timeout to 10 seconds
  );
});
