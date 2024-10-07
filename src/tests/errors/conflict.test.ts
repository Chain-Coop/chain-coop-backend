import { ConflictError } from '../../errors/conflict';
import { StatusCodes } from 'http-status-codes';

describe('ConflictError', () => {
  test('should create an instance of ConflictError', () => {
    const error = new ConflictError('Conflict occurred');
    expect(error).toBeInstanceOf(ConflictError);
  });

  test('should set the correct message and statusCode', () => {
    const message = 'Conflict occurred';
    const error = new ConflictError(message);

    // Check if the message is set correctly
    expect(error.message).toBe(message);

    // Check if the statusCode is set to 409 (CONFLICT)
    expect(error.statusCode).toBe(StatusCodes.CONFLICT);
  });
});
