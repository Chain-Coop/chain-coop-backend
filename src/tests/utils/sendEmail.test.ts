import { sendEmail, EmailOptions } from '../../utils/sendEmail';
import nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('sendEmail', () => {
  const mockSendMail = jest.fn();
  const options: EmailOptions = {
    to: 'test@example.com',
    subject: 'Test Subject',
    text: 'Test Text',
    html: '<p>Test HTML</p>',
  };

  beforeAll(() => {
    // Mock the transporter and include the options property
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: mockSendMail,
      options: { service: "gmail", secure: true, auth: { user: process.env.EMAIL_ADDRESS, pass: process.env.EMAIL_PASS } },
    });
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clear mocks after each test
  });

  it('should send an email successfully', async () => {
    mockSendMail.mockResolvedValueOnce(undefined); // Mock successful send

    await sendEmail(options);

    expect(mockSendMail).toHaveBeenCalledWith({
      from: process.env.EMAIL_ADDRESS,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });

  it('should throw an error when sending fails', async () => {
    const errorMessage = 'Failed to send email';
    mockSendMail.mockRejectedValueOnce(new Error(errorMessage)); // Mock failure

    await expect(sendEmail(options)).rejects.toThrow(errorMessage);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });
});
