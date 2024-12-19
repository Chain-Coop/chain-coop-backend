import User, { UserDocument } from '../models/authModel'; 
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
        console.log("Updates received:", updates);
    }
    if (updates.membershipPaymentStatus && ['paid', 'in-progress', 'not_started'].includes(updates.membershipPaymentStatus)) {
        user.membershipPaymentStatus = updates.membershipPaymentStatus as 'paid' | 'in-progress' | 'not_started';
        console.log("Updates received:", updates);
    }
    if (updates.membershipType && ['Explorer', 'Pioneer', 'Voyager']) {
        user.membershipType = updates.membershipType as 'Explorer', 'Pioneer', 'Voyager';
        console.log("Updates received:", updates);
    }

    // Save the updated user profile
    await user.save();

    // Return the updated user profile
    return user;
};

interface UserProfileUpdates {
    membershipStatus?: 'active' | 'pending' | 'inactive'; 
    membershipPaymentStatus?: 'paid' | 'in-progress' | 'not_started'; 
    membershipType?: string; 
}


