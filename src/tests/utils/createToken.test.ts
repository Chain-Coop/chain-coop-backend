import { createToken } from '../../utils/createToken';
import tokenGenerator from 'otp-generator';

jest.mock('otp-generator'); // Mock the otp-generator module

describe('Token Utils', () => {
    afterEach(() => {
        jest.clearAllMocks(); // Clear mocks after each test
    });

    describe('createToken', () => {
        it('should generate a token with digits only', async () => {
            const count = 6;
            const mockToken = '123456';
            (tokenGenerator.generate as jest.Mock).mockResolvedValueOnce(mockToken);

            const result = await createToken({ count, numeric: true });

            expect(tokenGenerator.generate).toHaveBeenCalledWith(count, {
                upperCaseAlphabets: false,
                specialChars: false,
                lowerCaseAlphabets: false,
                digits: true,
            });
            expect(result).toEqual(mockToken);
        });

        it('should generate a token with letters and digits', async () => {
            const count = 8;
            const mockToken = 'A1bC3dE4';
            (tokenGenerator.generate as jest.Mock).mockResolvedValueOnce(mockToken);

            const result = await createToken({ count });

            expect(tokenGenerator.generate).toHaveBeenCalledWith(count, {
                upperCaseAlphabets: true,
                specialChars: true,
                lowerCaseAlphabets: true,
                digits: true,
            });
            expect(result).toEqual(mockToken);
        });

        it('should throw an error if an invalid count is provided', async () => {
            const count = -1; // Invalid negative count
            
            // Mock the generator to throw an error if the count is invalid
            (tokenGenerator.generate as jest.Mock).mockImplementationOnce((count) => {
                if (count < 1) {
                    throw new Error('Invalid count');
                }
                return 'mockToken';
            });
        
            await expect(createToken({ count })).rejects.toThrow('Invalid count');
            expect(tokenGenerator.generate).not.toHaveBeenCalledWith(count, expect.anything()); // Check that the generator isn't called with invalid input
        });         
    });
});
