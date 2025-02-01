import { model, Schema, Document } from "mongoose";

export interface IBlog extends Document {
	title: string;
	summary: string;
	coverImage: {
		url: string;
		imageId: string;
	};
	content: string;
	status: "publish" | "save";
	createdAt: Date;
	updatedAt: Date;
	createdBy: Schema.Types.ObjectId;
	category: Schema.Types.ObjectId;
}

const BlogSchema = new Schema<IBlog>(
	{
		title: { type: String, required: true },
		summary: { type: String, required: true, maxLength: 100 },
		coverImage: {
			url: { type: String },
			imageId: { type: String },
		},
		content: { type: String, required: true },
		status: {
			type: String,
			required: true,
			enum: ["publish", "draft"],
		},
		createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
		category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
	},

	{ timestamps: true }
);

const Blog = model<IBlog>("Blog", BlogSchema);

export default Blog;
