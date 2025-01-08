import { Schema, model } from "mongoose";

export interface NewsLetterDocument extends Document {
	email: string;
}

const NewsLetterSchema = new Schema(
	{
		email: {
			type: String,
			trim: true,
			lowercase: true,
			unique: true,
		},
	},
	{ timestamps: true }
);

export default model<NewsLetterDocument>("NewsLetter", NewsLetterSchema);
