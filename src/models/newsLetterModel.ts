import { Schema, model } from "mongoose";

export interface NewsLetterDocument extends Document {
	email: string;
	name: string;
}

const NewsLetterSchema = new Schema(
	{
		email: {
			type: String,
			trim: true,
			lowercase: true,
			unique: true,
		},
		name: {
			type: String,
			trim: true,
			lowercase: true
		}
	},
	{ timestamps: true }
);

export default model<NewsLetterDocument>("NewsLetter", NewsLetterSchema);
