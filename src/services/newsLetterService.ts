import NewsLetter from "../models/newsLetterModel";

const addUserService = async (payload: any) => await NewsLetter.create(payload);
const findNewsLetterUser = async (payload: string) =>
	await NewsLetter.findOne({ email: payload });

export { addUserService, findNewsLetterUser };
