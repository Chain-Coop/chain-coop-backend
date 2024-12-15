import { CallbackError, Document, Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { encrypt } from "../services/encryption";

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
  username: String;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  isVerified: boolean;
  Tier: number;
  membershipType: string;
  membershipStatus: "active" | "pending" | "inactive";
  membershipPaymentStatus: "paid" | "in-progress" | "not_started";
  isWalletActivated: boolean;
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
    enum: ["Explorer", "Voyager", "Pioneer"],
    required: [true, "Membership type is required"],
  },

  username: {
    type: String,
    required: [true, "Username is required"],
  },

  phoneNumber: {
    type: String,
    required: [true, "Phone number is required"],
    unique: true,
  },

  profilePhoto: {
    url: String,
    imageId: String,
  },
  membershipStatus: {
    type: String,
    enum: ["active", "pending", "inactive"],
    default: "inactive",
  },
  membershipPaymentStatus: {
    type: String,
    enum: ["paid", "in-progress", "not_started"],
    default: "not_started",
  },
  Tier: {
    type: Number,
    enum: [0, 1, 2],
    default: 0,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  firstName: {
    type: String,
    required: [true, "First name is required"],
  },
  lastName: {
    type: String,
    required: [true, "Last name is required"],
  },
  isWalletActivated: { type: Boolean, default: false },
});

UserSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      return next(error as CallbackError);
    }
  }

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
