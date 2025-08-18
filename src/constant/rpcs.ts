import dotenv from 'dotenv';
dotenv.config();
export const LISK_RPC = process.env.LISK_RPC as string;
export const ETHERLINK_RPC = process.env.ETHERLINK_RPC as string;
export const BSC_RPC = process.env.BSC_RPC as string;
export const POLYGON_RPC = process.env.POLYGON_RPC as string;
