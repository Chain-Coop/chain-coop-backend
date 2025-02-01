import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { BadRequestError } from "../errors";
import * as blogService from "../services/blogService";
import uploadImageFile from "../utils/imageUploader";
import deleteDocument from "../utils/deleteDocument";

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

	res.status(StatusCodes.OK).json({ blog });
};

export const createBlogPost = async (req: Request, res: Response) => {
	const { title, summary, content, status } = req.body;
	//@ts-ignore
	const userId = req.user.userId;

	if (!title || !summary || !content || !status) {
		throw new BadRequestError(
			"Title, summary, content, and status are required"
		);
	}

	if (summary.length > 100) {
		throw new BadRequestError("Summary should not be more than 100 characters");
	}

	let coverImage;
	//@ts-ignore
	console.log(req.files.blogCoverImage);
	//@ts-ignore
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

	const newImg = req.files?.image;
	if (newImg) {
		if (blog.coverImage.imageId) {
			await deleteDocument(blog.coverImage.imageId);
		}
		const { public_id, secure_url } = await uploadImageFile(
			req,
			"blogs",
			"image"
		);
		updateData = {
			...req.body,
			image: { url: secure_url, imageId: public_id },
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
