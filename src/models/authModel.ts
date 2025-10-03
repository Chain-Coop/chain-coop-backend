import { CallbackError, Document, Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { encrypt } from '../services/encryption';
import { WalletDocument } from './wallet';

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
  username: string; 
  firstName: string;
  lastName: string;
  phoneNumber: string;
  gender: string;
  dateOfBirth: Date;
  referredByUsername?: string; // Track referrer by username
  isVerified: boolean;
  isPhoneVerified: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  Tier: number;
  membershipType: string;
  membershipStatus: 'active' | 'pending' | 'inactive';
  membershipPaymentStatus: 'paid' | 'in-progress' | 'not_started';
  isWalletActivated: boolean;
  isBitcoinWalletActivated: boolean;
  createdAt: Date; // added createdAt
  updatedAt: Date; // added updatedAt
  wallet?: WalletDocument;
}

const UserSchema = new Schema(
  {
    email: {
      type: String,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        'Please provide a valid email',
      ],
      required: [true, 'Email is required'],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
    },

    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
    },

    membershipType: {
      type: String,
      enum: ['individual', 'cooperate'],
      required: [true, 'Membership type is required'],
    },

    // Enhanced username field for referral system
    username: {
      type: String,
      required: [true, 'Username is required'], 
      unique: true, 
      lowercase: true, // Store in lowercase for consistency
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [20, 'Username cannot exceed 20 characters'],
      match: [
        /^[a-zA-Z0-9_]+$/,   
        'Username can only contain letters, numbers, and underscores'
      ],
      validate: {
        validator: function(username: string) {
          // Prevent reserved usernames
          const reserved = ['admin', 'root', 'api', 'www', 'support', 'help', 'null', 'undefined'];
          return !reserved.includes(username.toLowerCase());
        },
        message: 'This username is reserved and cannot be used'
      }
    },

    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
    },

    gender: {
      type: String,
      enum: ['male', 'female'],
      required: [true, 'Gender is required'],
    },

    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
      validate: {
        validator: function(value: Date) {
          return !value || value <= new Date();
        },
        message: 'Date of birth cannot be in the future'
      }
    },

    referredByUsername: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
    },

    profilePhoto: {
      url: String,
      imageId: String,
    },

    membershipStatus: {
      type: String,
      enum: ['active', 'pending', 'inactive'],
      default: 'inactive',
    },

    membershipPaymentStatus: {
      type: String,
      enum: ['paid', 'in-progress', 'not_started'],
      default: 'not_started',
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

    isPhoneVerified: {
      type: Boolean,
      default: false,
    },

    twoFactorEnabled:{
      type: Boolean,
      default: false
    },
    twoFactorSecret:{
      type: String,
      default: false
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
    },

    lastName: {
      type: String,
      required: [true, 'Last name is required'],
    },

    isWalletActivated: { 
      type: Boolean, 
      default: false 
    },

    isBitcoinWalletActivated: { 
      type: Boolean, 
      default: false 
    },
  },
  { timestamps: true }
); // added timestamps 

UserSchema.virtual('wallet', {
  ref: 'Wallet', // The model to use
  localField: '_id', // Find wallets where 'localField'
  foreignField: 'user', // is equal to foreignField
  justOne: true, // Only one wallet per user
});

UserSchema.set('toObject', { virtuals: true, transform(_doc, ret: any) {
    // strip sensitive fields before sending the user to the client
    delete ret.twoFactorSecret;
    return ret;
  },});
UserSchema.set('toJSON', { virtuals: true, transform(_doc, ret: any) {
    // strip sensitive fields before sending the user to the client
    delete ret.twoFactorSecret;
    return ret;
  },});

UserSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      return next(error as CallbackError);
    }
  }

  // Convert username to lowercase for consistency
  if (this.isModified('username')) {
    this.username = this.username.toLowerCase().trim();
  }

  // Convert referredByUsername to lowercase for consistency
  if (this.isModified('referredByUsername') && this.referredByUsername) {
    this.referredByUsername = this.referredByUsername.toLowerCase().trim();
  }

  next();
});

UserSchema.methods.createJWT = function () {
  return jwt.sign(
    {
      user: { 
        email: this.email, 
        userId: this._id, 
        role: this.role
      },
    },
    process.env.JWT_SECRET as string,
    {
      expiresIn: '30d',
    }
  );
};

UserSchema.methods.comparePasswords = async function (
  enteredPassword: string
): Promise<boolean> {
  const isCorrect = await bcrypt.compare(enteredPassword, this.password);
  return isCorrect;
};

export default model<UserDocument>('User', UserSchema);
