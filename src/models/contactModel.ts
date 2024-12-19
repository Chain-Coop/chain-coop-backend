import { Schema, model } from "mongoose";

export interface ContactDocument extends Document {
	email: string;
	name: string;
	message: string;
	phone_number: string;
}

const ContactSchema = new Schema(
	{
		email: {
			type: String,
			trim: true,
			lowercase: true,
		},
		name: {
			type: String,
			trim: true,
		},
		message: {
			type: String,
			trim: true,
		},
		phone_number: {
			type: String,
			trim: true,
		},
	},
	{ timestamps: true }
);

export default model<ContactDocument>("Contact", ContactSchema);
