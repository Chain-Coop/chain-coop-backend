// services/qoreidService.ts
import axios from 'axios';

interface QoreIDBooleanMatchParams {
  idNumber: string; // BVN
  firstname: string;
  lastname: string;
  dob?: string;
  phone?: string;
  email?: string;
  gender?: string;
}

interface AuthTokenResponse {
  accessToken: string;
  expiresIn: number; // in seconds
}

// In-memory token cache
let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

const getAuthToken = async (): Promise<string> => {
  const now = Date.now();

  // Return cached token if still valid (allow 1 min buffer)
  if (cachedToken && tokenExpiry && now < tokenExpiry - 60000) {
    return cachedToken;
  }

  try {
    const response = await axios.post<AuthTokenResponse>('https://api.qoreid.com/token', {
      clientId: process.env.QOREID_CLIENT_ID,
      secret: process.env.QOREID_SECRET_KEY
    });

    const { accessToken, expiresIn } = response.data;

    cachedToken = accessToken;
    tokenExpiry = now + expiresIn * 1000;

    return accessToken;
  } catch (error: any) {
    console.error('QoreID Auth Token Error:', error.response?.data || error.message);
    throw new Error('Failed to get QoreID auth token');
  }
};

export const verifyBVNBooleanMatchQoreID = async (params: QoreIDBooleanMatchParams) => {
  const { idNumber, ...rest } = params;

  try {
    const token = await getAuthToken();

    const response = await axios.post(
      `https://api.qoreid.com/v1/ng/identities/bvn-match/${idNumber}`,
      rest,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      message: 'BVN boolean match verification successful',
      data: response.data
    };
  } catch (error: any) {
    console.error('QoreID Boolean Match Error:', error.response?.data || error.message);

    return {
      success: false,
      message: error.response?.data?.message || 'BVN match verification failed',
      error: error.response?.data || null
    };
  }
};
