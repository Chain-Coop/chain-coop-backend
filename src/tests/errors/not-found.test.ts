import { NotFoundError } from '../../errors/not-found';
import { StatusCodes } from 'http-status-codes';

describe('NotFoundError', () => {
  test('should create an instance of NotFoundError', () => {
    const error = new NotFoundError('Resource not found');
    expect(error).toBeInstanceOf(NotFoundError);
  });

  test('should set the correct message and statusCode', () => {
    const message = 'Resource not found';
    const error = new NotFoundError(message);

    // Check if the message is set correctly
    expect(error.message).toBe(message);

    // Check if the statusCode is set to 404 (NOT_FOUND)
    expect(error.statusCode).toBe(StatusCodes.NOT_FOUND);
  });
});
