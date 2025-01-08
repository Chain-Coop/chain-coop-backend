import Contact from "../models/contactModel";

const addContactService = async (payload: any) => await Contact.create(payload);

const findContact = async (payload: any) => await Contact.findOne(payload);

const getAllContacts = async (payload?: any) => await Contact.find(payload);

export { addContactService, findContact, getAllContacts };
