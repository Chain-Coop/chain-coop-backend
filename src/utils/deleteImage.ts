import cloud from "cloudinary";

const cloudinary = cloud.v2;

const deleteImage = async (imageId: string) => {
  await cloudinary.uploader.destroy(imageId);
};

export default deleteImage;
