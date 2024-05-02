import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
	createUser,
	findUser,
	getUserDetails,
	resetUserPassword,
	updateUserByEmail,
	updateUserById,
} from "../services/authService";
import {
	BadRequestError,
	ConflictError,
	ForbiddenError,
	NotFoundError,
	UnauthenticatedError,
} from "../errors";
import { deleteOtp, findOtp, findOtpByEmail } from "../services/otpService";
import { generateAndSendOtp } from "../utils/sendOtp";

const register = async (req: Request, res: Response) => {
	const { email } = req.body;
	const legacyUser = await findUser("email", email!);
	if (legacyUser) {
		throw new ConflictError("Email already exists");
	}
	const user = await createUser(req.body);
	const token = await user.createJWT();

	await generateAndSendOtp({
		email: email!,
		message: "Your OTP to verify your account is",
		subject: "Email verification",
	});
	res.status(StatusCodes.CREATED).json({
		msg: "Registration successful, enter the OTP sent to your email",
		user: { _id: user._id, email: user.email, token },
	});
};

const verifyOtp = async (req: Request, res: Response) => {
	const { email, otp } = req.body;
	if (!email || !otp) {
		throw new BadRequestError("Email and otp is required");
	}
	const validOtp = await findOtp(email, otp);
	if (!validOtp) {
		throw new UnauthenticatedError("Failed to validate OTP");
	}
	const newUser = await updateUserByEmail(email, { status: "active" });
	if (!newUser) {
		throw new NotFoundError("User not found");
	}
	await deleteOtp(email);
	res
		.status(StatusCodes.OK)
		.json({ msg: "Your account has been activated", newUser });
};

const resendOtp = async (req: Request, res: Response) => {
	const { email } = req.body;
	const isOtp = await findOtpByEmail(email);
	if (isOtp) {
		await deleteOtp(email);
	}
	const user = await findUser("email", email);

	if (!user) {
		throw new NotFoundError("User with this email does not exist");
	}

	await generateAndSendOtp({
		email: email!,
		message: "Your OTP to verify your account is",
		subject: "Email verification",
	});

	res.status(StatusCodes.CREATED).json({
		msg: "OTP successfully sent to your email",
	});
};

const login = async (req: Request, res: Response) => {
	const { email, password } = req.body;

	if (!email || !password) {
		throw new BadRequestError("Email and password are required");
	}

	const user = await findUser("email", email!);
	if (!user) {
		throw new UnauthenticatedError("Invalid credentials");
	}

	const validPassword = await user.comparePasswords(password!);
	if (!validPassword) {
		throw new UnauthenticatedError("Invalid credentials");
	}

	const token = await user.createJWT();

	res.status(StatusCodes.OK).json({
		_id: user._id,
		email: user.email,
		token,
	});
};

const getUser = async (req: Request, res: Response) => {
	//@ts-ignore
	const id = req.user.userId;
	const user = await getUserDetails(id);
	res.status(StatusCodes.OK).json(user);
};

const forgetPassword = async (req: Request, res: Response) => {
	const { email } = req.body;
	if (!email) {
		throw new BadRequestError("Email is required");
	}
	const user = await findUser("email", email);
	if (!user) {
		throw new NotFoundError("User not found");
	}
	await generateAndSendOtp({
		email,
		message: "Your OTP to reset password is",
		subject: "Email verification",
	});
	res
		.status(StatusCodes.OK)
		.json({ msg: "Password reset OTP sent to your email" });
};

const resetPassword = async (req: Request, res: Response) => {
	const { otp, password, confirmPassword, email } = req.body;

	const user = await findUser("email", email);
	if (!user) {
		throw new NotFoundError("User with this email not found");
	}

	const isVerified = await findOtp(email, otp);
	if (!isVerified) {
		throw new BadRequestError("Invalid otp provided");
	}

	if (password !== confirmPassword) {
		throw new BadRequestError("Password and confirm password do not match");
	}

	await resetUserPassword(user, password);
	await deleteOtp(email);
	res.status(StatusCodes.OK).json({ msg: "Password reset successful" });
};

export {
	register,
	verifyOtp,
	resendOtp,
	login,
	forgetPassword,
	resetPassword,
	getUser,
};
