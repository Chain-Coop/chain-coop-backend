import NewsLetter from "../models/newsLetterModel";
import { addUserService, findNewsLetterUser } from "../services/newsLetterService"

// Mock the NewsLetter model
jest.mock("../models/newsLetterModel");

describe("Newsletter Service", () => {
  const mockEmail = "test@example.com";
  const mockPayload = { email: mockEmail };

  afterEach(() => {
    jest.clearAllMocks(); // Clear mocks after each test
  });

  it("should add a new user to the newsletter", async () => {
    (NewsLetter.create as jest.Mock).mockResolvedValue(mockPayload); // Mock the create function

    const result = await addUserService(mockPayload);
    
    expect(result).toEqual(mockPayload); // Validate the result matches the mock
    expect(NewsLetter.create).toHaveBeenCalledWith(mockPayload); // Ensure the create method was called with the correct payload
  });

  it("should find a user by email", async () => {
    (NewsLetter.findOne as jest.Mock).mockResolvedValue(mockPayload); // Mock the findOne function

    const result = await findNewsLetterUser(mockEmail);

    expect(result).toEqual(mockPayload); // Validate that the found user matches the mock
    expect(NewsLetter.findOne).toHaveBeenCalledWith({ email: mockEmail }); // Ensure findOne was called with the correct email
  });

  it("should return null if user is not found", async () => {
    (NewsLetter.findOne as jest.Mock).mockResolvedValue(null); // Mock not found case

    const result = await findNewsLetterUser("notfound@example.com");

    expect(result).toBeNull(); // Expect the result to be null
    expect(NewsLetter.findOne).toHaveBeenCalledWith({ email: "notfound@example.com" }); // Ensure findOne was called with the correct email
  });
});
