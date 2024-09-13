import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_KEY;
const PAYSTACK_SUBSCRIPTION_URL = 'https://api.paystack.co/subscribe';

type MembershipType = 'Explorer' | 'Pioneer' | 'Voyager';

const plans: Record<MembershipType, string> = {
  Explorer: process.env.PAYSTACK_EXPLORER_PLAN_ID || '',
  Pioneer: process.env.PAYSTACK_PIONEER_PLAN_ID || '',
  Voyager: process.env.PAYSTACK_VOYAGER_PLAN_ID || '',
};

export const createPaystackSubscription = async (email: string, planId: string) => {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('Paystack secret key is not defined');
  }

  try {
    const response = await axios.post(
      PAYSTACK_SUBSCRIPTION_URL,
      {
        email,
        plan: planId,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.data.authorization_url;
  } catch (error) {
    console.error('Error creating Paystack subscription:', error);
    return null;
  }
};

export const getPlanIdForMembershipType = (membershipType: MembershipType): string | undefined => {
  return plans[membershipType];
};
