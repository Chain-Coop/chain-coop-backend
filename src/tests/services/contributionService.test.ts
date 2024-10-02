import mongoose from "mongoose";
import {
  createContributionService,
  updateContributionService,
  findContributionService,
  createContributionHistoryService,
  findContributionHistoryService,
  updateContributionBankDetails,
  processRecurringContributions,
} from "../../services/contributionService";
import Contribution from "../../models/contribution";
import ContributionHistory from "../../models/contributionHistory";

const mockUserId = new mongoose.Types.ObjectId(); // Creating a mock user ID

// Mock Mongoose models
jest.mock("../../models/contribution");
jest.mock("../../models/contributionHistory");

describe("Contribution Service Tests", () => {
  const mockContribution = {
    _id: new mongoose.Types.ObjectId(), // Use ObjectId for mock contributions
    user: mockUserId,
    contributionPlan: "Monthly",
    amount: 100,
    balance: 200,
    status: "Pending",
    nextContributionDate: new Date(),
    lastContributionDate: new Date(),
    bankDetails: {
      accountNumber: "1234567890",
      bankCode: "XYZ",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("createContributionService should create a contribution", async () => {
    (Contribution.create as jest.Mock).mockResolvedValue(mockContribution);
    (Contribution.findOne as jest.Mock).mockResolvedValue({
      balance: 100,
    });

    const result = await createContributionService({
      user: mockUserId,
      contributionPlan: "Monthly",
      amount: 100,
    });

    expect(result).toEqual(mockContribution);
    expect(Contribution.create).toHaveBeenCalledWith({
      user: mockUserId,
      contributionPlan: "Monthly",
      amount: 100,
      balance: 200,
    });
  });

  test("updateContributionService should update a contribution", async () => {
    const updatedContribution = { ...mockContribution, amount: 150 };
    (Contribution.findByIdAndUpdate as jest.Mock).mockResolvedValue(updatedContribution);

    const result = await updateContributionService(mockContribution._id, { amount: 150 });

    expect(result).toEqual(updatedContribution);
    expect(Contribution.findByIdAndUpdate).toHaveBeenCalledWith(mockContribution._id, { amount: 150 }, {
      new: true,
      runValidators: true,
    });
  });

  test("findContributionService should find a contribution by user", async () => {
    (Contribution.findOne as jest.Mock).mockResolvedValue(mockContribution);

    const result = await findContributionService({ user: mockUserId });

    expect(result).toEqual(mockContribution);
    expect(Contribution.findOne).toHaveBeenCalledWith({ user: mockUserId });
  });

  test("createContributionHistoryService should create a contribution history", async () => {
    const mockHistory = {
      contribution: mockContribution._id,
      user: mockUserId,
      amount: 100,
      status: "Completed",
    };
    (ContributionHistory.create as jest.Mock).mockResolvedValue(mockHistory);

    const result = await createContributionHistoryService(mockContribution._id, mockUserId, 100, "Completed");

    expect(result).toEqual(mockHistory);
    expect(ContributionHistory.create).toHaveBeenCalledWith(mockHistory);
  });

  test("findContributionHistoryService should find contribution history by user", async () => {
    const mockHistories = [mockContribution];
    (ContributionHistory.find as jest.Mock).mockResolvedValue(mockHistories);

    const result = await findContributionHistoryService(mockUserId);

    expect(result).toEqual(mockHistories);
    expect(ContributionHistory.find).toHaveBeenCalledWith({ user: mockUserId });
  });

  test("updateContributionBankDetails should update bank details", async () => {
    const bankDetails = { accountNumber: "1234567890", bankCode: "XYZ" };
    (Contribution.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockContribution);

    const result = await updateContributionBankDetails(mockContribution._id, bankDetails);

    expect(result).toEqual(mockContribution);
    expect(Contribution.findByIdAndUpdate).toHaveBeenCalledWith(
      mockContribution._id,
      { bankDetails },
      { new: true }
    );
  });

  test("processRecurringContributions should process pending contributions", async () => {
    const pendingContribution = { ...mockContribution, status: "Pending", nextContributionDate: new Date() };
    (Contribution.find as jest.Mock).mockResolvedValue([pendingContribution]);
    (createContributionService as jest.Mock).mockResolvedValue(mockContribution);
    (updateContributionService as jest.Mock).mockResolvedValue(mockContribution);

    await processRecurringContributions();

    expect(Contribution.find).toHaveBeenCalledWith({ status: "Pending" });
    expect(createContributionService).toHaveBeenCalled();
    expect(updateContributionService).toHaveBeenCalled();
  });
});
