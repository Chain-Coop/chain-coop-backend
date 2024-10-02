import { addContactService, findContact, getAllContacts } from "../../services/contactService";
import Contact from "../../models/contactModel";

jest.mock("../../models/contactModel");

describe("Contact Services", () => {
    describe("addContactService", () => {
        it("should create a new contact", async () => {
        const payload = { name: "John Doe", email: "john@example.com" };
        (Contact.create as jest.Mock).mockResolvedValue(payload); // Mock the create method

        const result = await addContactService(payload);
        expect(result).toEqual(payload);
        expect(Contact.create).toHaveBeenCalledWith(payload); // Ensure create was called with the right payload
        });
    });

    describe("findContact", () => {
        it("should find a contact by the given payload", async () => {
        const mockContact = { _id: "contactId123", name: "Jane Doe", email: "jane@example.com" };
        (Contact.findOne as jest.Mock).mockResolvedValue(mockContact); // Mock the findOne method

        const result = await findContact({ email: "jane@example.com" });
        expect(result).toEqual(mockContact); // Verify the returned result
        });

        it("should return null if contact is not found", async () => {
        (Contact.findOne as jest.Mock).mockResolvedValue(null); // Mock the findOne method to return null

        const result = await findContact({ email: "nonexistent@example.com" });
        expect(result).toBeNull(); // Verify the returned result is null
        });
    });

    describe("getAllContacts", () => {
        it("should return an array of all contacts", async () => {
        const mockContacts = [
            { _id: "contactId123", name: "Jane Doe", email: "jane@example.com" },
            { _id: "contactId124", name: "John Smith", email: "john@example.com" },
        ];
        (Contact.find as jest.Mock).mockResolvedValue(mockContacts); // Mock the find method

        const result = await getAllContacts();
        expect(result).toEqual(mockContacts); // Verify the returned result
        });

        it("should return an empty array if no contacts are found", async () => {
        (Contact.find as jest.Mock).mockResolvedValue([]); // Mock the find method to return an empty array

        const result = await getAllContacts();
        expect(result).toEqual([]); // Verify the returned result is an empty array
        });

        it("should return filtered contacts based on payload", async () => {
        const mockContacts = [
            { _id: "contactId123", name: "Jane Doe", email: "jane@example.com" },
        ];
        (Contact.find as jest.Mock).mockResolvedValue(mockContacts); // Mock the find method

        const result = await getAllContacts({ email: "jane@example.com" });
        expect(result).toEqual(mockContacts); // Verify the returned result
        });
    });
});
