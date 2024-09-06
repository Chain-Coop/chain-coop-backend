import cloudinary from "cloudinary";
import { Request } from "express";
import fs from "fs";
import { BadRequestError, EntityTooLarge } from "../errors";

const cloudinaryInstance = cloudinary.v2;

const uploadProfilePicture = async (req: Request, userId: string) => {
	try {
		// @ts-ignore
		const file = req.files?.profilePicture;
		const maxSize = 1024 * 1024 * 5; // 5MB

		if (!file) {
			throw new BadRequestError("Please upload a profile picture");
		}

		// @ts-ignore
		if (file.size > maxSize) {
			throw new EntityTooLarge("Max size of 5MB exceeded");
		}

		const uploadedFile = await uploadToCloudinary(file);
		// @ts-ignore
		if (file.tempFilePath) {
			// @ts-ignore
			fs.unlinkSync(file.tempFilePath);
		}

		return uploadedFile;
	} catch (error) {
		throw error;
	}
};

const uploadToCloudinary = async (file: any) => {
	const { public_id, secure_url } = await cloudinaryInstance.uploader.upload(
		file.tempFilePath,
		{
			resource_type: "image",
			use_filename: true,
			folder: "profile_pictures",
		}
	);

	return { public_id, secure_url };
};

const deleteProfilePicture = async (publicId: string) => {
	await cloudinaryInstance.uploader.destroy(publicId);
};

export { uploadProfilePicture, deleteProfilePicture };
