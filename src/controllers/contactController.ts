import { Request, Response } from "express";
import {
	addContactService,
	findContact,
	getAllContacts,
} from "../services/contactService";
import { StatusCodes } from "http-status-codes";
import { BadRequestError } from "../errors";

const createContactMsg = async (req: Request, res: Response) => {
	const { name, email, phone_number, message } = req.body;
	if (!email) {
		throw new BadRequestError("Email is required");
	}
	if (!name) {
		throw new BadRequestError("Name is required");
	}
	if (!phone_number) {
		throw new BadRequestError("Phone number is required");
	}
	const contact = await addContactService({
		name,
		email,
		phone_number,
		message,
	});
	return res.status(StatusCodes.CREATED).json(contact);
};

const getContacts = async (req: Request, res: Response) => {
	const contacts = await getAllContacts();
	return res.status(StatusCodes.OK).json(contacts);
};



// for logged-in users
const createContactMsgLoggedIn = async (req: Request, res: Response) => {
	const { name, email, message } = req.body;

	if (!email) {
		throw new BadRequestError("Email is required");
	}
	if (!name) {
		throw new BadRequestError("Name is required");
	}
	if (!message) {
		throw new BadRequestError("Message is required");
	}

	const contact = await addContactService({
		name,
		email,
		message, 
	});

	return res.status(StatusCodes.CREATED).json(contact);
};


export { createContactMsg, createContactMsgLoggedIn, getContacts };
