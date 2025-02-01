import Comment from "../models/commentModel";

export const addComment = async (
	blogId: string,
	name: string,
	comment: string
) => {
	const newComment = new Comment({ blogId, name, comment });
	await newComment.save();
	return newComment;
};

export const getCommentsByBlog = async (blogId: string) => {
	return await Comment.find({ blogId }).sort({ createdAt: -1 });
};

export const getCommentById = async (id: string) => {
	return await Comment.findById(id);
};

export const deleteCommentService = async (id: string) => {
	return await Comment.findOneAndDelete({ _id: id });
};
