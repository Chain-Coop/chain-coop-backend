import { model, Schema, Document } from "mongoose";

export interface IBlog extends Document {
	title: string;
	summary: string;
	image: {
		url: string;
		imageId: string;
	};
	content: string;
	status: "publish" | "save";
	createdAt: Date;
	updatedAt: Date;
}

const BlogSchema = new Schema<IBlog>(
	{
		title: { type: String, required: true },
		summary: { type: String, required: true, maxLength: 100 },
		image: {
			url: { type: String, required: true },
			imageId: { type: String, required: true },
		},
		content: { type: String, required: true },
		status: {
			type: String,
			required: true,
			enum: ["publish", "save"],
		},
	},
	{ timestamps: true }
);

const Blog = model<IBlog>("Blog", BlogSchema);

export default Blog;
