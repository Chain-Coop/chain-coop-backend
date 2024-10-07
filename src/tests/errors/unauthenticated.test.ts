import { UnauthenticatedError } from '../../errors/unauthenticatedt';
import { StatusCodes } from 'http-status-codes';

describe('UnauthenticatedError', () => {
  test('should create an instance of UnauthenticatedError', () => {
    const error = new UnauthenticatedError('Authentication required');
    expect(error).toBeInstanceOf(UnauthenticatedError);
  });

  test('should set the correct message and statusCode', () => {
    const message = 'Authentication required';
    const error = new UnauthenticatedError(message);

    // Check if the message is set correctly
    expect(error.message).toBe(message);

    // Check if the statusCode is set to 401 (UNAUTHORIZED)
    expect(error.statusCode).toBe(StatusCodes.UNAUTHORIZED);
  });
});
