import InternalServerError from '../../errors/internal-server';
import { StatusCodes } from 'http-status-codes';

describe('InternalServerError', () => {
  test('should create an instance of InternalServerError', () => {
    const error = new InternalServerError('Something went wrong');
    expect(error).toBeInstanceOf(InternalServerError);
  });

  test('should set the correct message and statusCode', () => {
    const message = 'Something went wrong';
    const error = new InternalServerError(message);

    // Check if the message is set correctly
    expect(error.message).toBe(message);

    // Check if the statusCode is set to 500 (INTERNAL_SERVER_ERROR)
    expect(error.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });
});
