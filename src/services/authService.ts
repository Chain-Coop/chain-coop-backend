import { NotFoundError } from "../errors";
import User, { UserDocument } from "../models/authModel";

const createUser = async (payload: any) => await User.create(payload);

const findUser = async (by: string, val: string) =>
  by === "email"
    ? await User.findOne({ email: val })
    : by === "id"
    ? await User.findOne({ _id: val })
    : "";

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

const resetUserPassword = async (user: UserDocument, password: string) => {
  user.password = password;
  await user.save();
};

export {
  createUser,
  findUser,
  updateUserByEmail,
  updateUserById,
  getUserDetails,
  resetUserPassword,
  getAdminDetails,
};
