import { generateAndSendOtp } from '../../utils/sendOtp';
import { createOtp } from '../../services/otpService';
import { sendEmail } from '../../utils/sendEmail';
import { createToken } from '../../utils/createToken'; // Import the createToken function

jest.mock('../../services/otpService');
jest.mock('../../utils/sendEmail');
jest.mock('../../utils/createToken'); // Mock createToken

describe('generateAndSendOtp', () => {
    const mockEmail = 'test@example.com';
    const mockSubject = 'Your OTP';
    const mockMessage = 'Your OTP is';
    const mockOtp = '123456'; // Define the expected OTP value

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should generate and send an OTP successfully', async () => {
        (createToken as jest.Mock).mockResolvedValueOnce(mockOtp); // Mock createToken to return the expected OTP
        (createOtp as jest.Mock).mockResolvedValueOnce(undefined); // Mock createOtp
        (sendEmail as jest.Mock).mockResolvedValueOnce(undefined); // Mock sendEmail

        await generateAndSendOtp({
            email: mockEmail,
            subject: mockSubject,
            message: mockMessage,
        });

        expect(createOtp).toHaveBeenCalledWith(mockEmail, mockOtp);
        expect(sendEmail).toHaveBeenCalledWith({
            subject: mockSubject,
            to: mockEmail,
            text: `${mockMessage} : ${mockOtp}`,
        });
    });

    it('should handle errors when sending email fails', async () => {
        (createToken as jest.Mock).mockResolvedValueOnce(mockOtp); // Mock createToken to return the expected OTP
        (createOtp as jest.Mock).mockResolvedValueOnce(undefined); // Mock createOtp
        (sendEmail as jest.Mock).mockRejectedValueOnce(new Error('Email sending failed')); // Mock error

        await expect(generateAndSendOtp({
            email: mockEmail,
            subject: mockSubject,
            message: mockMessage,
        })).rejects.toThrow('Email sending failed');

        expect(createOtp).toHaveBeenCalledWith(mockEmail, mockOtp);
        expect(sendEmail).toHaveBeenCalledWith({
            subject: mockSubject,
            to: mockEmail,
            text: `${mockMessage} : ${mockOtp}`,
        });
    });
});
