import { ForbiddenError } from '../../errors/forbidden';
import { StatusCodes } from 'http-status-codes';

describe('ForbiddenError', () => {
  test('should create an instance of ForbiddenError', () => {
    const error = new ForbiddenError('Access denied');
    expect(error).toBeInstanceOf(ForbiddenError);
  });

  test('should set the correct message and statusCode', () => {
    const message = 'Access denied';
    const error = new ForbiddenError(message);

    // Check if the message is set correctly
    expect(error.message).toBe(message);

    // Check if the statusCode is set to 403 (FORBIDDEN)
    expect(error.statusCode).toBe(StatusCodes.FORBIDDEN);
  });
});
