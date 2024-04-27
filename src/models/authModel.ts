import { Document, Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export interface UserDocument extends Document {
	email: string;
	password: string;
	createJWT(): Function;
	comparePasswords(enteredPassword: string): Function;
	role: string;
	profilePhoto: {
		url: string;
		imageId: string;
	};
	membershipType: string;
}

const UserSchema = new Schema({
	email: {
		type: String,
		match: [
			/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
			"Please provide a valid email",
		],
		required: [true, "Email is required"],
	},

	password: {
		type: String,
		required: [true, "Password is required"],
	},

	role: {
		type: String,
		enum: ["admin", "user"],
		default: "user",
	},

	membershipType: {
		type: String,
		enum: ["patron", "investor members"],
		required: [true, "Membership type is required"],
	},

	profilePhoto: {
		url: String,
		imageId: String,
	},
});

UserSchema.pre("save", async function (next) {
	if (this.password === undefined) {
		return;
	}
	const salt = await bcrypt.genSaltSync(10);
	const passHash = await bcrypt.hashSync(this.password, salt);
	this.password = passHash;
	next();
});

UserSchema.methods.createJWT = function () {
	return jwt.sign(
		{
			user: { email: this.email, userId: this._id, role: this.role },
		},
		process.env.JWT_SECRET as string,
		{
			expiresIn: "30d",
		}
	);
};

UserSchema.methods.comparePasswords = async function (
	enteredPassword: string
): Promise<boolean> {
	const isCorrect = await bcrypt.compare(enteredPassword, this.password);
	return isCorrect;
};

export default model<UserDocument>("User", UserSchema);
