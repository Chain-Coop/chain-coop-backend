import mongoose, { Types } from "mongoose";
import Membership from "../../models/membership";
import {
  createMembershipService,
  updateMembershipService,
  findMembershipService,
} from "../../services/membershipService";

// Mock the Membership model
jest.mock("../../models/membership");

describe("Membership Service", () => {
  const mockMembershipPayload = {
    user: new Types.ObjectId(), // Create a mock ObjectId for the user
    plan: "Gold",
    status: "Active",
  };

  afterEach(() => {
    jest.clearAllMocks(); // Clear mocks after each test
  });

  it("should create a new membership", async () => {
    const membershipWithId = { ...mockMembershipPayload, _id: new Types.ObjectId() }; // Add _id to the mock
    (Membership.create as jest.Mock).mockResolvedValue(membershipWithId); // Mock the create function

    const membership = await createMembershipService(mockMembershipPayload);
    expect(membership).toHaveProperty("_id"); // Check that it has an _id
    expect(membership.user).toEqual(mockMembershipPayload.user); // Validate the user
    expect(membership.status).toEqual(mockMembershipPayload.status); // Validate the status
  });

  it("should update an existing membership", async () => {
    const existingMembership = { ...mockMembershipPayload, _id: new Types.ObjectId() }; // Mock existing membership
    (Membership.findOneAndUpdate as jest.Mock).mockResolvedValue({ ...existingMembership, status: "Inactive" }); // Mock the update function

    const updatedMembership = await updateMembershipService(existingMembership._id.toString(), { status: "Inactive" });
    expect(updatedMembership).toHaveProperty("status", "Inactive"); // Validate the updated status
  });

  it("should find the latest membership by userId", async () => {
    const existingMembership = { ...mockMembershipPayload, _id: new Types.ObjectId() }; // Mock existing membership
    (Membership.findOne as jest.Mock).mockReturnValue({
      sort: jest.fn().mockResolvedValue(existingMembership), // Mock the return value of sort
    }); // Mock the findOne function

    const foundMembership = await findMembershipService(mockMembershipPayload.user.toString());
    
    // Check if foundMembership is not null
    expect(foundMembership).not.toBeNull(); // Ensure that a membership was found

    if (foundMembership) { // Now TypeScript knows foundMembership is not null
      expect(foundMembership).toHaveProperty("_id"); // Check that it found a membership
      expect(foundMembership.user.toString()).toEqual(mockMembershipPayload.user.toString()); // Validate the user
    }
  });
});
