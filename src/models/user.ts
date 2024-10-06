import mongoose, { Schema, Document } from 'mongoose';

// Extend the UserDocument interface to include membershipType
export interface UserDocument extends Document {
    email: string;
    password: string;
    membershipStatus: 'active' | 'pending' | 'inactive';
    membershipPaymentStatus: 'paid' | 'in-progress' | 'not_started';
    membershipType?: string; // Add this field if necessary
}

const UserSchema: Schema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
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
    membershipType: {
        type: String, // Adjust this if there are specific membership types
        required: false,
    },
});

const User = mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema);



export default User;
