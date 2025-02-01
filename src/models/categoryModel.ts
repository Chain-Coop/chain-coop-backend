import { model, Schema, Document } from "mongoose";

export interface ICategory extends Document {
	name: string;
	createdAt: Date;
	updatedAt: Date;
	createdBy: Schema.Types.ObjectId;
}

const CategorySchema = new Schema<ICategory>(
	{
		name: {
			type: String,
			required: [true, "Name is required"],
			trim: true,
			lowercase: true,
		},
		createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
	},
	{ timestamps: true }
);

const Category = model<ICategory>("Category", CategorySchema);

export default Category;
