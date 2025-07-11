import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { findUser } from "../services/authService";
import {
  uploadProfilePicture as uploadProfilePicToCloudinary,
  deleteProfilePicture as deleteProfilePicFromCloudinary,
} from "../services/profilePictureService";
import { NotFoundError } from "../errors";
import { logUserOperation } from "../middlewares/logging";

const uploadProfilePicture = async (req: Request, res: Response) => {
  let userId = null;
  try {
    //@ts-ignore
    userId = req.user.userId;

    // Upload image to Cloudinary and get the upload result
    const uploadedImage = await uploadProfilePicToCloudinary(req, userId);

    // Find the user and update profile picture
    const user = await findUser("id", userId);
    if (!user) {
      throw new NotFoundError("User not found.");
    }

    // Remove existing image from Cloudinary
    if (user.profilePhoto.imageId) {
      await deleteProfilePicFromCloudinary(user.profilePhoto.imageId);
    }

    // Update user with new profile photo details
    user.profilePhoto = {
      url: uploadedImage.secure_url,
      imageId: uploadedImage.public_id,
    };
    await user.save();

    await logUserOperation(userId, req, "UPDATE_PROFILE_PIC", "Success");
    res.status(StatusCodes.OK).json({
      msg: "Profile picture updated successfully.",
      profilePhoto: user.profilePhoto,
    });
  } catch (error) {
    await logUserOperation(userId ?? "", req, "UPDATE_PROFILE_PIC", "Failure");
  throw error;
  }
};

export { uploadProfilePicture };
