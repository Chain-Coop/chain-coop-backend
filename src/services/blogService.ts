import Blog, { IBlog } from "../models/blogSchema";

export const getAllBlogs = async (page: number, limit: number) => {
	const skip = (page - 1) * limit;
	return await Blog.find()
		.skip(skip)
		.limit(limit)
		.sort({ createdAt: -1 })
		.populate("createdBy", "username firstName lastName");
};

export const getBlogById = async (id: string) => {
	return await Blog.findById(id);
};

export const createBlog = async (blogData: Partial<IBlog>) => {
	return await Blog.create(blogData);
};

export const updateBlog = async (id: string, updateData: Partial<IBlog>) => {
	return await Blog.findByIdAndUpdate(id, updateData, {
		new: true,
		runValidators: true,
	});
};

export const deleteBlog = async (id: string) => {
	return await Blog.findByIdAndDelete(id);
};
