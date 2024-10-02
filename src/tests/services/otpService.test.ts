import OTP from "../../models/otpModel";
import { createOtp, findOtp, findOtpByEmail, deleteOtp } from "../../services/otpService";

// Mock the OTP model
jest.mock("../../models/otpModel");

describe("OTP Service", () => {
  const mockEmail = "test@example.com";
  const mockOtp = "123456";
  const mockOtpDocument = { email: mockEmail, otp: mockOtp };

  afterEach(() => {
    jest.clearAllMocks(); // Clear mocks after each test
  });

  it("should create a new OTP", async () => {
    (OTP.create as jest.Mock).mockResolvedValue(mockOtpDocument); // Mock the create function

    const result = await createOtp(mockEmail, mockOtp);

    expect(result).toEqual(mockOtpDocument); // Validate the result matches the mock
    expect(OTP.create).toHaveBeenCalledWith({ email: mockEmail, otp: mockOtp }); // Ensure create was called with the correct parameters
  });

  it("should find an OTP by email and value", async () => {
    (OTP.findOne as jest.Mock).mockResolvedValue(mockOtpDocument); // Mock the findOne function

    const result = await findOtp(mockEmail, mockOtp);

    expect(result).toEqual(mockOtpDocument); // Validate the found OTP matches the mock
    expect(OTP.findOne).toHaveBeenCalledWith({ email: mockEmail, otp: mockOtp }); // Ensure findOne was called with the correct parameters
  });

  it("should find an OTP by email", async () => {
    (OTP.findOne as jest.Mock).mockResolvedValue(mockOtpDocument); // Mock the findOne function

    const result = await findOtpByEmail(mockEmail);

    expect(result).toEqual(mockOtpDocument); // Validate the found OTP matches the mock
    expect(OTP.findOne).toHaveBeenCalledWith({ email: mockEmail }); // Ensure findOne was called with the correct email
  });

  it("should return null if OTP is not found by email and value", async () => {
    (OTP.findOne as jest.Mock).mockResolvedValue(null); // Mock not found case

    const result = await findOtp(mockEmail, "wrongOtp");

    expect(result).toBeNull(); // Expect the result to be null
    expect(OTP.findOne).toHaveBeenCalledWith({ email: mockEmail, otp: "wrongOtp" }); // Ensure findOne was called with the correct parameters
  });

  it("should delete an OTP by email", async () => {
    (OTP.findOneAndDelete as jest.Mock).mockResolvedValue(mockOtpDocument); // Mock the delete function

    const result = await deleteOtp(mockEmail);

    expect(result).toEqual(mockOtpDocument); // Validate the deleted OTP matches the mock
    expect(OTP.findOneAndDelete).toHaveBeenCalledWith({ email: mockEmail }); // Ensure delete was called with the correct email
  });

  it("should return null if OTP is not found for deletion", async () => {
    (OTP.findOneAndDelete as jest.Mock).mockResolvedValue(null); // Mock not found case

    const result = await deleteOtp(mockEmail);

    expect(result).toBeNull(); // Expect the result to be null
    expect(OTP.findOneAndDelete).toHaveBeenCalledWith({ email: mockEmail }); // Ensure delete was called with the correct email
  });
});
