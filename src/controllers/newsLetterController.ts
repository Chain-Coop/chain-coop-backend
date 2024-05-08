import { Request, Response } from "express";
import {
	addUserService,
	findNewsLetterUser,
} from "../services/newsLetterService";
import { StatusCodes } from "http-status-codes";
import { EmailOptions, sendEmail } from "../utils/sendEmail";
import { joinWaitingListMail } from "../templates/joinwaitlist";
import { BadRequestError } from "../errors";

const joinWaitingList = async (req: Request, res: Response) => {
	const { email, name } = req.body;
	const isRegistered = await findNewsLetterUser(email);
	if (isRegistered) {
		throw new BadRequestError("You have already joined the waitlist");
	}
	await addUserService({ email, name });
	const emailPayload: EmailOptions = {
		subject: "Welcome on board",
		to: email,
		html: joinWaitingListMail({ name }),
	};
	await sendEmail(emailPayload);
	res.status(StatusCodes.CREATED).json({
		msg: "You have been successfully added to the waiting list and will get notified",
	});
};

export { joinWaitingList };
