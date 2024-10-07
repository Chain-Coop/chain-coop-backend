import { BadRequestError } from '../../errors/bad-request';
import { StatusCodes } from 'http-status-codes';

describe('BadRequestError', () => {
  test('should create an instance of BadRequestError', () => {
    const error = new BadRequestError('Invalid request');
    expect(error).toBeInstanceOf(BadRequestError);
  });

  test('should set the correct message and statusCode', () => {
    const message = 'Invalid request';
    const error = new BadRequestError(message);

    // Check if the message is set correctly
    expect(error.message).toBe(message);

    // Check if the statusCode is set to 400 (BAD_REQUEST)
    expect(error.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });
});
