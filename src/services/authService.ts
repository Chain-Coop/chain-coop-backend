import { NotFoundError } from "../errors";
import User, { UserDocument } from "../models/authModel";

interface CreateUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  membershipType: "individual" | "cooperate";
  username: string;
  gender?: "male" | "female";
  dateOfBirth?: Date;
  referredByUsername?: string;
}

const createUser = async (payload: CreateUserPayload) => await User.create(payload);

const findUser = async (by: string, val: string) =>
  by === "email"
    ? await User.findOne({ email: val })
    : by === "id"
    ? await User.findOne({ _id: val })
    : by === "phoneNumber"
    ? await User.findOne({ phoneNumber: val })
    : "";

const findExistingUser = async (email: string, phoneNumber: string) => {
  let user = await User.findOne({
    $or: [{ email }, { phoneNumber }],
  });
  return user;
};

const getUserDetails = async (id: string) =>
  await User.findOne({ _id: id }).select("-password");

const getAdminDetails = async () =>
  await User.find({ role: "admin" }).select("-password");

const updateUserByEmail = async (email: string, payload: any) =>
  await User.findOneAndUpdate({ email }, payload, {
    new: true,
    runValidators: true,
  });

const updateUserById = async (id: string, payload: any) =>
  await User.findOneAndUpdate({ _id: id }, payload, {
    new: true,
    runValidators: true,
  });

const updateUserByWhatsApp = async (phoneNumber: string, payload: any) =>
  await User.findOneAndUpdate({ phoneNumber }, payload, {
    new: true,
    runValidators: true,
  });

const resetUserPassword = async (user: UserDocument, password: string) => {
  user.password = password;
  await user.save();
};

export {
  createUser,
  findUser,
  updateUserByEmail,
  updateUserById,
  updateUserByWhatsApp,
  getUserDetails,
  resetUserPassword,
  getAdminDetails,
  findExistingUser,
};
