# Chain-Coop-Backend

Chain-Coop-Backend is the backend service for the Chain Cooperative platform, which allows users to manage projects, portfolios, contributions, shares, and proposals. This service is built using Node.js, Express, and MongoDB, and leverages Cloudinary for file storage.

## Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Workflow Overview](#workflow-overview)
- [Example Workflow](#example-workflow)
- [API Endpoints](#api-endpoints)
- [Models](#models)
- [Services](#services)
- [Controllers](#controllers)
- [Utilities](#utilities)
- [Environment Variables](#environment-variables)
- [Contributing](#contributing)
- [License](#license)

## Getting Started

### Prerequisites

- Node.js (>= 18.x)
- MongoDB
- Cloudinary Account

### Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/Chain-Coop/chain-coop-backend.git

2. Change to the project directory:
    ```sh
    cd chain-coop-backend
    ```

3. Install dependencies:
    ```sh
    npm install
    ```

4. Set up environment variables:
    Create a `.env` file in the root directory and add the following:
    ```sh
    MONGO_URI=<your_mongodb_uri>
    CLOUDINARY_CLOUD_NAME=<your_cloudinary_cloud_name>
    CLOUDINARY_API_KEY=<your_cloudinary_api_key>
    CLOUDINARY_API_SECRET=<your_cloudinary_api_secret>
    JWT_SECRET=<your_jwt_secret>
    ```
    Ensure that you keep these variables secure and do not share them publicly, especially since this is a private repository.


5. Build the project:
    ```sh
    npm run build
    ```

6. Run the server:
    ```sh
    npm start
    ```
    The server will start on [http://localhost:3000](http://localhost:3000).

### Development

To run the project in development mode with automatic restarts, use:

```sh
npm run dev
```

### Project Structure

```bash
chain-coop-backend/
├── controllers/
│   ├── authController.ts
│   ├── projectController.ts
│   ├── portfolioController.ts
│   ├── proposalController.ts
│   └── userController.ts
├── models/
│   ├── projectModel.ts
│   ├── portfolioModel.ts
│   ├── proposalModel.ts
│   ├── userModel.ts
│   └── contributionModel.ts
├── routes/
│   ├── authRoutes.ts
│   ├── projectRoutes.ts
│   ├── portfolioRoutes.ts
│   ├── proposalRoutes.ts
│   ├── userRoutes.ts
│   └── contributionRoutes.ts
├── services/
│   ├── projectService.ts
│   ├── portfolioService.ts
│   ├── proposalService.ts
│   ├── userService.ts
│   └── contributionService.ts
├── utils/
│   ├── deleteDocument.ts
│   ├── extractPublicId.ts
│   └── uploadDocument.ts
├── .env
├── package.json
├── tsconfig.json
└── README.md
```

## Workflow Overview

The backend service is organized in a **Controller-Service-Model** pattern. Here's how the different components work together:

- **Controllers**: These handle HTTP requests, validate input, and send appropriate responses to the client. They use the logic from services and handle the interaction between the client and the server.

- **Services**: These handle the business logic of the application. Services interact with models to read/write data from the database and ensure that the data flow follows the business rules.

- **Models**: These define the structure of the MongoDB documents and act as a bridge between the service logic and the actual database.

- **Routes**: Routes define the URLs the client can access. Each route is mapped to a controller function to handle the request.

- **Utilities**: Helper functions for repetitive tasks like uploading files to Cloudinary or interacting with external APIs like Paystack.


## Example Workflow: Withdrawal Request Flow

### User Initiates Withdrawal

1. **User Request**: The user makes a POST request to `/request-withdrawal`, providing the amount, bank account number, and bank code.

2. **Controller Handling**: The `withdrawalController.ts` handles this request by verifying the bank account details using the Paystack API.

    ```ts
    export const requestWithdrawal = async (req: Request, res: Response) => {
      try {
        //@ts-ignore
        const userId = req.user.userId;
        const { amount, accountNumber, bankCode } = req.body;

        if (!amount || !accountNumber || !bankCode) {
          throw new BadRequestError("Amount, account number, and bank code are required");
        }

        // Verify the bank account details using Paystack
        const verifyResponse = await axios.get("https://api.paystack.co/bank/resolve", {
          params: { account_number: accountNumber, bank_code: bankCode },
          headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
        });

        const accountDetails = verifyResponse.data.data;

        if (!accountDetails) {
          throw new BadRequestError("Invalid bank account details");
        }

        // If bank details are verified, proceed with the withdrawal process
        const withdrawal = await createWithdrawalRequest(userId, amount, { accountNumber, bankCode });

        res.status(StatusCodes.CREATED).json({
          message: "Withdrawal request created successfully",
          withdrawal,
        });
      } catch (error) {
        if (error instanceof Error) {
          res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
        } else {
          res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal Server Error" });
        }
      }
    };
    ```

3. **Service Function**: If verification is successful, the withdrawal request is created and saved in the database using the `createWithdrawalRequest` service function.

    ```ts
    export const createWithdrawalRequest = async (userId: string, amount: number, bankDetails: { accountNumber: string, bankCode: string }) => {
      if (amount <= 0) {
        throw new BadRequestError('Amount must be greater than zero');
      }

      const withdrawal = await Withdrawal.create({ user: userId, amount, bankDetails });
      return withdrawal;
    };
    ```
## Example Workflow

### Bank Verification and Withdrawal Process

1. **User Initiates Withdrawal**:
   - The user submits a request to withdraw funds by providing the amount, bank account number, and bank code.

2. **System Verifies Bank Details**:
   - The system uses the Paystack API to verify the provided bank account details to ensure they are valid.

3. **Create Withdrawal Request**:
   - If the bank details are verified successfully, the system creates a withdrawal request and saves it in the database.

4. **Admin Updates Withdrawal Status**:
   - An authorized admin updates the status of the withdrawal request based on the transaction process (e.g., pending, completed, or failed).

This workflow ensures that the user’s funds are securely processed and that only authorized admins have the ability to update the withdrawal status.


# API Endpoints Documentation

You can check all the API endpoints by visiting the following link:

[API Endpoints Documentation](https://documenter.getpostman.com/view/27189273/2sA3JFA4bj#877715d5-f3cf-4b24-9fec-5ff9571db864)

This documentation includes details on all available API endpoints, their methods, required parameters, and sample requests/responses.

## Contributing

Contributions to this project are restricted to the internal development team. If you are part of the team and would like to contribute, please follow these steps:

1. **Clone the Repository:** Clone the repository to your local machine.
2. **Create a New Branch:** Create a new branch for your feature or bug fix.
3. **Develop Your Changes:** Implement your changes and ensure they are tested.
4. **Submit a Pull Request:** Submit a pull request for review. Ensure that your PR includes a detailed description of the changes made and any relevant issues it addresses.
5. **Code Review:** Wait for the code review and make any necessary adjustments based on feedback.

For major changes, please discuss them with the team first by opening an issue or scheduling a meeting.

## License

This project is licensed under the MIT License. As this is a private repository, access to the source code is limited to authorized contributors.
