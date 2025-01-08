import { Schema, model } from "mongoose";
export interface WalletHistoryDocument extends Document {
	amount: number;
	label: string;
	type: string;
	ref: string;
	user: Schema.Types.ObjectId;
}

const WalletHistorySchema = new Schema<WalletHistoryDocument>(
	{
		amount: Number,
		label: String,
		ref: String,
		type: {
			type: String,
			enum: ["credit", "debit"],
		},
		user: {
			type: Schema.Types.ObjectId,
			ref: "User",
		},
	},
	{ timestamps: true }
);

export default model<WalletHistoryDocument>(
	"WalletHistory",
	WalletHistorySchema
);
