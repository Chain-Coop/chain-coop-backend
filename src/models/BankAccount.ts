import mongoose from 'mongoose';

const bankAccountSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    accountNumber: { type: String, required: true },
    bankCode: { type: String, required: true },
    accountName: { type: String, required: true }, // Account name for verification
    createdAt: { type: Date, default: Date.now }
});

const BankAccount = mongoose.model('BankAccount', bankAccountSchema);

export default BankAccount;