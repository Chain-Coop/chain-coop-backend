import cloud from "cloudinary";

const cloudinary = cloud.v2;

const deleteDocument = async (docId: string) => {
	await cloudinary.uploader.destroy(docId);
};

export default deleteDocument;
