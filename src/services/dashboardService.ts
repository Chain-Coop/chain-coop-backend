import User from "../models/user";

export const fetchUserStatistics = async (): Promise<{
  totalUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
}> => {
  // Query the database for user statistics
  const totalUsers = await User.countDocuments();
  const verifiedUsers = await User.countDocuments({ isVerified: true });
  const unverifiedUsers = await User.countDocuments({ isVerified: false });

  return {
    totalUsers,
    verifiedUsers,
    unverifiedUsers,
  };
};

export const fetchUsersInfo = async (): Promise<
  Array<{
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    phoneNumber: string;
    membershipType: string;
    membershipStatus: string;
    membershipPaymentStatus: string;
    Tier: number;
    isVerified: boolean;
  }>
> => {
  // Fetch only the required fields
  const users = await User.find(
    {},
    "firstName lastName username email phoneNumber membershipType membershipStatus membershipPaymentStatus Tier isVerified"
  ).lean();

  // Ensure undefined values are handled properly
  return users.map((user) => ({
    firstName: user.firstName || "N/A",
    lastName: user.lastName || "N/A",
    username: user.username || "N/A",
    email: user.email,
    phoneNumber: user.phoneNumber || "N/A",
    membershipType: user.membershipType || "N/A",
    membershipStatus: user.membershipStatus || "N/A",
    membershipPaymentStatus: user.membershipPaymentStatus || "N/A",
    Tier: user.Tier || "N/A",
    isVerified: user.isVerified,
  }));
};


export const fetchUserMembershipStats = async (): Promise<{
  membershipStatus: Record<string, number>;
  membershipPaymentStatus: Record<string, number>;
  membershipType: Record<string, number>;
}> => {
  const membershipStatus = await User.aggregate([
    { $group: { _id: "$membershipStatus", count: { $sum: 1 } } },
  ]);

  const membershipPaymentStatus = await User.aggregate([
    { $group: { _id: "$membershipPaymentStatus", count: { $sum: 1 } } },
  ]);

  const membershipType = await User.aggregate([
    { $group: { _id: "$membershipType", count: { $sum: 1 } } },
  ]);

  // Convert results to an object format
  const formatResults = (results: any[]) =>
    results.reduce((acc, cur) => {
      acc[cur._id] = cur.count;
      return acc;
    }, {});

  return {
    membershipStatus: formatResults(membershipStatus),
    membershipPaymentStatus: formatResults(membershipPaymentStatus),
    membershipType: formatResults(membershipType),
  };
};
