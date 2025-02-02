import { Schema, model, Types, Document } from "mongoose";

interface IComment extends Document {
	blogId: Types.ObjectId;
	name: string;
	comment: string;
	createdAt: Date;
	updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
	{
		blogId: {
			type: Schema.Types.ObjectId,
			ref: "Blog",
			required: true,
		},
		name: {
			type: String,
			required: true,
			trim: true,
		},
		comment: {
			type: String,
			required: true,
			trim: true,
		},
	},
	{ timestamps: true }
);

export default model<IComment>("Comment", CommentSchema);
