import request from "supertest";
import express, { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

// Mock services
const addContactService = jest.fn();
const getAllContacts = jest.fn();

// Contact Controller Implementation
const createContactMsg = async (req: Request, res: Response) => {
    const { name, email, phone_number, message } = req.body;

    // Validate input
    if (!email) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Email is required" });
    }
    if (!name) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Name is required" });
    }
    if (!phone_number) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Phone number is required" });
    }

    try {
        const contact = await addContactService({ name, email, phone_number, message });
        res.status(StatusCodes.CREATED).json(contact);
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Failed to create contact" });
    }
};

const createContactMsgLoggedIn = async (req: Request, res: Response) => {
    const { name, email, message } = req.body;

    // Validate input
    if (!email) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Email is required" });
    }
    if (!name) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Name is required" });
    }
    if (!message) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Message is required" });
    }

    try {
        const contact = await addContactService({ name, email, message });
        res.status(StatusCodes.CREATED).json(contact);
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Failed to create contact" });
    }
};

const getContacts = async (req: Request, res: Response) => {
    try {
        const contacts = await getAllContacts();
        res.status(StatusCodes.OK).json(contacts);
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Failed to retrieve contacts" });
    }
};

// Create a test Express app
const app = express();
app.use(express.json());
app.post("/contacts", createContactMsg);
app.get("/contacts", getContacts);
app.post("/contacts/logged-in", createContactMsgLoggedIn);

// Test Cases
describe("Contact Controller", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("createContactMsg", () => {
        test("should create a new contact successfully", async () => {
            const mockContact = {
                name: "John Doe",
                email: "john@example.com",
                phone_number: "123456789",
                message: "Hello",
            };

            (addContactService as jest.Mock).mockResolvedValue(mockContact);

            const response = await request(app)
                .post("/contacts")
                .send(mockContact);

            expect(response.status).toBe(StatusCodes.CREATED);
            expect(response.body).toEqual(mockContact);
            expect(addContactService).toHaveBeenCalledWith(mockContact);
        });

        test("should return an error if email is missing", async () => {
            const mockContact = {
                name: "John Doe",
                phone_number: "123456789",
                message: "Hello",
            };

            const response = await request(app)
                .post("/contacts")
                .send(mockContact);

            expect(response.status).toBe(StatusCodes.BAD_REQUEST);
            expect(response.body.message).toBe("Email is required");
        });

        test("should return an error if name is missing", async () => {
            const mockContact = {
                email: "john@example.com",
                phone_number: "123456789",
                message: "Hello",
            };

            const response = await request(app)
                .post("/contacts")
                .send(mockContact);

            expect(response.status).toBe(StatusCodes.BAD_REQUEST);
            expect(response.body.message).toBe("Name is required");
        });

        test("should return an error if phone number is missing", async () => {
            const mockContact = {
                name: "John Doe",
                email: "john@example.com",
                message: "Hello",
            };

            const response = await request(app)
                .post("/contacts")
                .send(mockContact);

            expect(response.status).toBe(StatusCodes.BAD_REQUEST);
            expect(response.body.message).toBe("Phone number is required");
        });
    });

    describe("createContactMsgLoggedIn", () => {
        test("should create a new contact for logged-in user", async () => {
            const mockContact = {
                name: "John Doe",
                email: "john@example.com",
                message: "Hello",
            };

            (addContactService as jest.Mock).mockResolvedValue(mockContact);

            const response = await request(app)
                .post("/contacts/logged-in")
                .send(mockContact);

            expect(response.status).toBe(StatusCodes.CREATED);
            expect(response.body).toEqual(mockContact);
            expect(addContactService).toHaveBeenCalledWith(mockContact);
        });

        test("should return an error if email is missing", async () => {
            const mockContact = {
                name: "John Doe",
                message: "Hello",
            };

            const response = await request(app)
                .post("/contacts/logged-in")
                .send(mockContact);

            expect(response.status).toBe(StatusCodes.BAD_REQUEST);
            expect(response.body.message).toBe("Email is required");
        });

        test("should return an error if name is missing", async () => {
            const mockContact = {
                email: "john@example.com",
                message: "Hello",
            };

            const response = await request(app)
                .post("/contacts/logged-in")
                .send(mockContact);

            expect(response.status).toBe(StatusCodes.BAD_REQUEST);
            expect(response.body.message).toBe("Name is required");
        });

        test("should return an error if message is missing", async () => {
            const mockContact = {
                name: "John Doe",
                email: "john@example.com",
            };

            const response = await request(app)
                .post("/contacts/logged-in")
                .send(mockContact);

            expect(response.status).toBe(StatusCodes.BAD_REQUEST);
            expect(response.body.message).toBe("Message is required");
        });
    });

    describe("getContacts", () => {
        test("should get all contacts successfully", async () => {
            const mockContacts = [
                { name: "John Doe", email: "john@example.com", phone_number: "123456789", message: "Hello" },
                { name: "Jane Doe", email: "jane@example.com", phone_number: "987654321", message: "Hi" },
            ];

            (getAllContacts as jest.Mock).mockResolvedValue(mockContacts);

            const response = await request(app).get("/contacts");

            expect(response.status).toBe(StatusCodes.OK);
            expect(response.body).toEqual(mockContacts);
            expect(getAllContacts).toHaveBeenCalled();
        });
    });
});

// Start Express app for testing
if (require.main === module) {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

export { createContactMsg, createContactMsgLoggedIn, getContacts };