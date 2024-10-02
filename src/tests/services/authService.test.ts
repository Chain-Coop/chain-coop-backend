import { 
    createUser,
	findUser,
	updateUserByEmail,
	updateUserById,
	getUserDetails,
	resetUserPassword 
} from "../../services/authService";
import User from "../../models/authModel";
import { UserDocument } from "../../models/authModel";
// Mock the User model
jest.mock("../../models/authModel");

// Test for createUser
describe("authServices - createUser", () => {
  it("should call User.create with correct payload", async () => {
    const mockPayload = { email: "test@example.com", password: "password123" };
    const mockUser = { ...mockPayload, _id: "userId123" };

    (User.create as jest.Mock).mockResolvedValue(mockUser);

    const result = await createUser(mockPayload);

    expect(User.create).toHaveBeenCalledWith(mockPayload);
    expect(result).toEqual(mockUser);
  });
});

// Test for findUser
describe("authServices - findUser", () => {
    it("should find a user by email", async () => {
      const mockEmail = "test@example.com";
      const mockUser = { _id: "userId123", email: mockEmail };
  
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
  
      const result = await findUser("email", mockEmail);
  
      expect(User.findOne).toHaveBeenCalledWith({ email: mockEmail });
      expect(result).toEqual(mockUser);
    });
  
    it("should find a user by id", async () => {
      const mockId = "userId123";
      const mockUser = { _id: mockId, email: "test@example.com" };
  
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
  
      const result = await findUser("id", mockId);
  
      expect(User.findOne).toHaveBeenCalledWith({ _id: mockId });
      expect(result).toEqual(mockUser);
    });
});

// Test for getUserDetails
describe("authServices - getUserDetails", () => {
    it("should retrieve user details without the password", async () => {
      const mockId = "userId123";
      const mockUser = { _id: mockId, email: "test@example.com", password: "hashedPassword" };
  
      (User.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({ _id: mockId, email: "test@example.com" }),
      });
  
      const result = await getUserDetails(mockId);
  
      expect(User.findOne).toHaveBeenCalledWith({ _id: mockId });
      expect(result).toEqual({ _id: mockId, email: "test@example.com" });
    });
});

// Test for updateUserByEmail
describe("authServices - updateUserByEmail", () => {
    it("should update user by email", async () => {
      const mockEmail = "test@example.com";
      const mockPayload = { name: "Updated Name" };
      const mockUpdatedUser = { email: mockEmail, name: "Updated Name" };
  
      (User.findOneAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedUser);
  
      const result = await updateUserByEmail(mockEmail, mockPayload);
  
      expect(User.findOneAndUpdate).toHaveBeenCalledWith(
        { email: mockEmail },
        mockPayload,
        { new: true, runValidators: true }
      );
      expect(result).toEqual(mockUpdatedUser);
    });
});

// Test for updateUserById
describe("authServices - updateUserById", () => {
    it("should update user by id", async () => {
      const mockId = "userId123";
      const mockPayload = { name: "Updated Name" };
      const mockUpdatedUser = { _id: mockId, name: "Updated Name" };
  
      (User.findOneAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedUser);
  
      const result = await updateUserById(mockId, mockPayload);
  
      expect(User.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockId },
        mockPayload,
        { new: true, runValidators: true }
      );
      expect(result).toEqual(mockUpdatedUser);
    });
});
  
// Test for resetUserPassword
describe("authServices - resetUserPassword", () => {
    it("should reset the user password", async () => {
      const mockUser: Partial<UserDocument> = {
        _id: "userId123",
        password: "oldPassword",
        save: jest.fn(),  // Mocking the save method
      };
  
      const newPassword = "newPassword123";
  
      await resetUserPassword(mockUser as UserDocument, newPassword);
  
      // Expect the password to be updated and save to be called
      expect(mockUser.password).toEqual(newPassword);
      expect(mockUser.save).toHaveBeenCalled();
    });
  });