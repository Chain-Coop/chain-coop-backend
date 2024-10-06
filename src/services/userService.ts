import User, { UserDocument } from '../models/user'; // Import the correct UserDocument type
import { NotFoundError } from '../errors';

export const updateUserProfile = async (userId: string, updates: Partial<UserProfileUpdates>) => {
    // Find the user by their ID
    const user = await User.findById(userId);

    // If the user is not found, throw a NotFoundError
    if (!user) {
        throw new NotFoundError('User not found');
    }

    // Update the user fields, ensuring the updates conform to the allowed enums
    if (updates.membershipStatus && ['active', 'pending', 'inactive'].includes(updates.membershipStatus)) {
        user.membershipStatus = updates.membershipStatus as 'active' | 'pending' | 'inactive';
    }
    if (updates.membershipPaymentStatus && ['paid', 'in-Progress', 'not_started'].includes(updates.membershipPaymentStatus)) {
        user.membershipPaymentStatus = updates.membershipPaymentStatus as 'paid' | 'in-progress' | 'not_started';
    }
    if (updates.membershipType) {
        user.membershipType = updates.membershipType;
    }

    // Save the updated user profile
    await user.save();

    // Return the updated user profile
    return user;
};

// Define the interface for the updates object (optional but recommended)
interface UserProfileUpdates {
    membershipStatus?: 'active' | 'pending' | 'inactive'; // Use the same types as UserDocument
    membershipPaymentStatus?: 'paid' | 'in-progress' | 'not_started'; // Use the same types as UserDocument
    membershipType?: string; // Assuming membershipType is just a string and not restricted to an enum
}


