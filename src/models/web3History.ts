import mongoose, { Schema, Document, Types } from "mongoose";
import User, { UserDocument } from "./user";

export interface Web3HistoryDocument extends Document {
  user: Types.ObjectId | UserDocument; 
  transactionType: string;
  Amount: number;
  Token: string;
  TxHash:string;
  
}

const WebHistorySchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId, 
      ref: "User",
      required: true,
     
    },
    transactionType: {
      type: String,
      enum:["SEND","SAVE","TRANSFER"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    Token: {
      type: String,
      enum: ["USDT","USDC","LSK","ETH","WUSDC","LUSD"],
      required: true,
    
    },
  },
  {
    timestamps: true, 
  }
);


const Web3History =
  mongoose.models.web3History ||
  mongoose.model<Web3HistoryDocument>("Web3History", WebHistorySchema);

export default Web3History;
