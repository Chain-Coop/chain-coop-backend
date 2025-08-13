import dotenv from 'dotenv';
dotenv.config();

const VANT_BASE_URL =
    process.env.NODE_ENV === 'development' ?
        process.env.VANT_BASE_URL_TEST! : process.env.VANT_BASE_URL_LIVE!;

export const VantConfig = {
    baseURL: VANT_BASE_URL,
    secretKey: process.env.X_VANT_KEY!,
};
