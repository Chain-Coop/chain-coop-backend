import { EntityTooLarge } from '../../errors/large-entity'
import { StatusCodes } from 'http-status-codes';

describe('EntityTooLarge', () => {
  test('should create an instance of EntityTooLarge', () => {
    const error = new EntityTooLarge('Request entity is too large');
    expect(error).toBeInstanceOf(EntityTooLarge);
  });

  test('should set the correct message and statusCode', () => {
    const message = 'Request entity is too large';
    const error = new EntityTooLarge(message);

    // Check if the message is set correctly
    expect(error.message).toBe(message);

    // Check if the statusCode is set to 413 (REQUEST_TOO_LONG)
    expect(error.statusCode).toBe(StatusCodes.REQUEST_TOO_LONG);
  });
});
