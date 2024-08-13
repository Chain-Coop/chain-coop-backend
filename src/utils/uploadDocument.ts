import { UploadApiResponse, v2 as cloudinary } from "cloudinary";
const uploadDocument = async (file: any, folder: string): Promise<string> => {
	const result: UploadApiResponse = await cloudinary.uploader.upload(
		file.tempFilePath,
		{
			folder,
		}
	);
	return result.secure_url;
};

export default uploadDocument;
