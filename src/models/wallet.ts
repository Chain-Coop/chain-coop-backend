import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";

export interface WalletDocument extends Document {
<<<<<<< HEAD
	balance: number;
	pin: string;
	user: Schema.Types.ObjectId;
	isPinCreated: boolean;
	bankAccounts: Array<{
		accountNumber: string;
		bankCode: string;
		accountName: string;
		bankId: number;
		bankName?: string;
	}>;
	fundedProjects: Array<fundedProject>;
	allCards?: Array<{
		number: string;
		authCode: string;
		isPreferred?: boolean;
		failedAttempts?: number;
	}>;
	hasWithdrawnBefore: boolean;
=======
  balance: number;
  pin: string;
  user: Schema.Types.ObjectId;
  isPinCreated: boolean;
  bankAccounts: Array<{
    accountNumber: string;
    bankCode: string;
    accountName: string;
    bankId: number;
  }>;
  fundedProjects: Array<fundedProject>;
  Card?: {
    data: string;
    failedAttempts: number;
  };
  hasWithdrawnBefore: boolean;
>>>>>>> 0b5ea30 (feature(card): Using paystack authorizations)
}

export type fundedProject = {
	amount: number;
	projectId: any;
};

const WalletSchema = new Schema<WalletDocument>(
<<<<<<< HEAD
	{
		balance: Number,
		pin: { type: String },
		user: {
			type: Schema.Types.ObjectId,
			ref: "User",
		},
		isPinCreated: {
			type: Boolean,
			default: false,
		},
		// Modified to bankAccounts (array of bank details)
		bankAccounts: [
			{
				accountNumber: String,
				bankCode: String,
				accountName: String,
				bankId: Number,
				bankName: String,
			},
		],
		fundedProjects: [
			{
				amount: {
					type: Number,
				},
				projectId: {
					type: Schema.Types.ObjectId,
					ref: "Project",
				},
				_id: false,
			},
		],
		allCards: [
			{
				number: {
					type: String,
				},
				authCode: {
					type: String,
				},
				_id: false,
				isPreferred: {
					type: Boolean,
					default: false,
				},
				failedAttempts: {
					type: Number,
					default: 0,
				},
			},
		],
		hasWithdrawnBefore: {
			type: Boolean,
			default: false,
		},
	},
	{ timestamps: true }
=======
  {
    balance: Number,
    pin: { type: String },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    isPinCreated: {
      type: Boolean,
      default: false,
    },
    // Modified to bankAccounts (array of bank details)
    bankAccounts: [
      {
        accountNumber: String,
        bankCode: String,
        accountName: String,
        bankId: Number,
      },
    ],
    fundedProjects: [
      {
        amount: {
          type: Number,
        },
        projectId: {
          type: Schema.Types.ObjectId,
          ref: "Project",
        },
        _id: false,
      },
    ],

    hasWithdrawnBefore: {
      type: Boolean,
      default: false,
    },
    Card: {
      data: String,
      failedAttempts: Number,
    },
  },
  { timestamps: true }
>>>>>>> 0b5ea30 (feature(card): Using paystack authorizations)
);

WalletSchema.pre("save", async function (next) {
	if (!this.isModified("pin")) {
		return next();
	}
	const salt = await bcrypt.genSaltSync(10);
	const pinHash = await bcrypt.hashSync(this.pin!, salt);
	this.pin = pinHash;
	next();
});

export default model<WalletDocument>("Wallet", WalletSchema);
