import cloud from "cloudinary";
import { Request } from "express";
const cloudinary = cloud.v2;
import fs from "fs";
import { BadRequestError, EntityTooLarge } from "../errors";

const uploadImageFile = async (
  req: Request,
  key: string,
  resourceType: string
) => {
  try {
    // @ts-ignore
    const file = req.files[key];
    const maxSize = 1024 * 1024 * 5;
    if (!file) {
      throw new BadRequestError(`Please upload a ${key}`);
    }

    //@ts-ignore
    if (file.size > maxSize) {
      throw new EntityTooLarge("Max size of 5mb exceeded");
    }

    const uploadedFile = await uploadToCloudinary(file, key, resourceType);
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

const uploadToCloudinary = async (
  file: any,
  key: string,
  resourceType: string
) => {
  const { public_id, secure_url } = await cloudinary.uploader.upload(
    file.tempFilePath,
    {
      //@ts-ignore
      resource_type: resourceType,
      use_filename: true,
      folder: key,
    }
  );

  return { public_id, secure_url };
};

export default uploadImageFile;
