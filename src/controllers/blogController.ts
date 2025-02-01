import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { BadRequestError, NotFoundError } from "../errors";
import * as blogService from "../services/blogService";
import uploadImageFile from "../utils/imageUploader";
import deleteDocument from "../utils/deleteDocument";
import {
	addComment,
	deleteCommentService,
	getCommentById,
	getCommentsByBlog,
} from "../services/commentService";
import * as categoryService from "../services/categoryService";

export const getAllBlogPost = async (req: Request, res: Response) => {
	const page = Number(req.query.page) || 1;
	const limit = Number(req.query.limit) || 10;
	const blogs = await blogService.getAllBlogs(page, limit);

	if (!blogs.length) {
		return res
			.status(StatusCodes.OK)
			.json({ msg: "No blog post at the moment", blogs });
	}

	res.status(StatusCodes.OK).json({ count: blogs.length, blogs });
};

export const getBlogPost = async (req: Request, res: Response) => {
	const { id } = req.params;
	const blog = await blogService.getBlogById(id);

	if (!blog) {
		throw new BadRequestError("Blog post does not exist");
	}

	const comments = await getCommentsByBlog(id);
	res.status(StatusCodes.OK).json({ blog, comments });
};

export const createBlogPost = async (req: Request, res: Response) => {
	const { title, summary, content, status, category } = req.body;
	//@ts-ignore
	const userId = req.user.userId;

	if (!title || !summary || !content || !status || !category) {
		throw new BadRequestError(
			"Title, summary, content, category and status are required"
		);
	}

	const confirmedCategory = await categoryService.getCategoryById(category);

	if (!confirmedCategory) {
		throw new BadRequestError("Invalid category");
	}

	if (summary.length > 100) {
		throw new BadRequestError("Summary should not be more than 100 characters");
	}

	let coverImage;
	if (req.files && req.files.blogCoverImage) {
		coverImage = await uploadImageFile(req, "blogCoverImage", "image");
	}
	const blog = await blogService.createBlog({
		...req.body,
		createdBy: userId,
		coverImage: { url: coverImage?.secure_url, imageId: coverImage?.public_id },
	});

	res.status(StatusCodes.CREATED).json({ blog });
};

export const updateBlogPost = async (req: Request, res: Response) => {
	const { id } = req.params;
	let updateData = req.body;
	const blog = await blogService.getBlogById(id);

	if (!blog) {
		throw new BadRequestError("Blog post not found");
	}

	const newImg = req.files?.coverImage;
	if (newImg) {
		if (blog.coverImage.imageId) {
			await deleteDocument(blog.coverImage.imageId);
		}
		const { public_id, secure_url } = await uploadImageFile(
			req,
			"blogCoverImage",
			"image"
		);
		updateData = {
			...req.body,
			coverImage: { url: secure_url, imageId: public_id },
		};
	}

	const updatedBlog = await blogService.updateBlog(id, updateData);
	res
		.status(StatusCodes.OK)
		.json({ updatedBlog, msg: "Blog update successful" });
};

export const deleteBlogPost = async (req: Request, res: Response) => {
	const { id } = req.params;
	const blog = await blogService.getBlogById(id);

	if (!blog) {
		throw new BadRequestError("Blog not found");
	}

	if (blog.coverImage.imageId) {
		await deleteDocument(blog.coverImage.imageId);
	}

	await blogService.deleteBlog(id);
	res.status(StatusCodes.OK).json({ msg: "Blog post deleted successfully" });
};

export const createComment = async (req: Request, res: Response) => {
	const blogId = req.params.id;
	const { name, comment } = req.body;
	if (!name || !comment) {
		throw new BadRequestError("Blog ID, name, and comment are required");
	}

	const blogExists = await blogService.getBlogById(blogId);
	if (!blogExists) {
		throw new NotFoundError("Blog post not found");
	}

	const newComment = await addComment(blogId, name, comment);

	res.status(StatusCodes.CREATED).json({
		msg: "Comment added successfully",
		comment: newComment,
	});
};

export const deleteComment = async (req: Request, res: Response) => {
	const { commentId } = req.params;

	const comment = await getCommentById(commentId);
	if (!comment) {
		throw new NotFoundError("Comment not found");
	}

	await deleteCommentService(commentId);

	res.status(StatusCodes.OK).json({
		success: true,
		msg: "Comment deleted successfully",
	});
};

export const createCategory = async (req: Request, res: Response) => {
	const { name } = req.body;
	//@ts-ignore
	const createdBy = req.user.userId;

	if (!name || !createdBy) {
		throw new BadRequestError("Name and createdBy are required");
	}

	const newCategory = await categoryService.addCategory(name, createdBy);

	res.status(StatusCodes.CREATED).json({
		msg: "Category created successfully",
		category: newCategory,
	});
};

export const getCategories = async (req: Request, res: Response) => {
	const categories = await categoryService.getCategories();
	res.status(StatusCodes.OK).json({
		count: categories.length,
		categories,
	});
};

export const updateCategory = async (req: Request, res: Response) => {
	const { categoryId } = req.params;
	const { name } = req.body;

	if (!name) {
		throw new BadRequestError("Name is required");
	}

	const updatedCategory = await categoryService.updateCategory(
		categoryId,
		name
	);
	if (!updatedCategory) {
		throw new NotFoundError("Category not found");
	}

	res.status(StatusCodes.OK).json({
		success: true,
		msg: "Category updated successfully",
		category: updatedCategory,
	});
};

export const deleteCategory = async (req: Request, res: Response) => {
	const { categoryId } = req.params;

	const category = await categoryService.getCategoryById(categoryId);
	if (!category) {
		throw new NotFoundError("Category not found");
	}

	await categoryService.deleteCategory(categoryId);

	res.status(StatusCodes.OK).json({
		success: true,
		msg: "Category deleted successfully",
	});
};
