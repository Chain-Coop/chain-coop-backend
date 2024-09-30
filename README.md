# Chain-Coop-Backend

Chain-Coop-Backend is the backend service for the Chain Cooperative platform, which allows users to manage projects, portfolios, contributions, shares, and proposals. This service is built using Node.js, Express, and MongoDB, and leverages Cloudinary for file storage.

## Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Workflow Overview](#workflow-overview)
- [Example Workflow](#example-workflow)
- [Code Workflow Explanation](#code-orkflow-explanation)
- [API Endpoints](#api-endpoints)
- [Models](#models)
- [Routes](#routes)
- [Services](#services)
- [Errors](#errors)
- [Middleware](#middlewares)
- [Utilities](#utils)
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
│   ├── bankController.ts
│   ├── contactController.ts
│   ├── contributionController.ts
│   ├── membershipController.ts
│   ├── newsLetterController.ts
│   ├── portfolioController.ts
│   ├── profilePictureController.ts
│   ├── projectController.ts
│   ├── proposalController.ts
│   ├── walletController.ts
│   └── withdrawalController.ts
├── models/
│   ├── authModel.ts
│   ├── contactModel.ts
│   ├── contribution.ts
│   ├── contributionHistory.ts
│   ├── membership.ts
│   ├── newsLetterModel.ts
│   ├── otpModel.ts
│   ├── portfolioModel.ts
│   ├── projectModel.ts
│   ├── proposalModel.ts
│   ├── wallet.ts
│   ├── walletHistory.ts
│   └── withdrawal.ts
├── routes/
│   ├── authRoute.ts
│   ├── contactRoute.ts
│   ├── contributionRoute.ts
│   ├── index.ts
│   ├── membershipRoutes.ts
│   ├── newsLetterRouter.ts
│   ├── portfolioRoutes.ts
│   ├── profilePictureRoutes.ts
│   ├── projectRoutes.ts
│   ├── proposalRoute.ts
│   ├── walletRoute.ts
│   └── withdrawalRoutes.ts
├── services/
│   ├── authService.ts
│   ├── contactService.ts
│   ├── contributionService.ts
│   ├── membershipService.ts
│   ├── newsLetterService.ts
│   ├── otpService.ts
│   ├── paystackService.ts
│   ├── portfolioService.ts
│   ├── profilePictureService.ts
│   ├── projectService.ts
│   ├── proposalService.ts
│   ├── walletService.ts
│   └── withdrawalService.ts
├── errors/
│   ├── bad-request.ts
│   ├── conflict.ts
│   ├── custom-api.ts
│   ├── forbidden.ts
│   ├── index.ts
│   ├── internal-server.ts
│   ├── large-entity.ts
│   ├── not-found.ts
│   ├── unauthenticated.ts
├── middlewares/
│   ├── authorization.ts
│   ├── errorHandler.ts
│   └── notFoundMiddleWare.ts
├── utils/
│   ├── bankUtils.ts
│   ├── createToken.ts
│   ├── deleteDoc.ts
│   ├── deleteDocument.ts
│   ├── extractPublicId.ts
│   ├── imageUploader.ts
│   ├── sendEmail.ts
│   ├── sendOtp.ts
│   └── uploadDocument.ts
├── templates/
├── db/
├── .env
├── package.json
├── tsconfig.json
└── README.md
```
## Folders and Files

### `controllers/`: 
Contains all the controller files, which handle incoming requests and direct the application to the appropriate service or model.

- `authController.ts`: Handles user authentication-related operations.
- `bankController.ts`: Manages bank-related operations.
- `contactController.ts`: Handles contact information requests.
- `contributionController.ts`: Manages contributions and their transactions.
- `membershipController.ts`: Handles membership management.
- `newsLetterController.ts`: Manages newsletter subscriptions and communication.
- `portfolioController.ts`: Deals with portfolio-related actions.
- `profilePictureController.ts`: Manages user profile picture uploads and retrieval.
- `projectController.ts`: Handles project-related actions.
- `proposalController.ts`: Manages project proposal submissions and reviews.
- `walletController.ts`: Deals with wallet-related operations.
- `withdrawalController.ts`: Manages withdrawal transactions.

### `models/`: 
Contains the database models that represent entities in the system.

- `authModel.ts`: Defines the schema for user authentication data.
- `contactModel.ts`: Defines the schema for storing contact information.
- `contribution.ts`: Represents user contributions in the cooperative.
- `contributionHistory.ts`: Tracks the history of user contributions.
- `membership.ts`: Defines the schema for membership data.
- `newsLetterModel.ts`: Manages newsletter subscription data.
- `otpModel.ts`: Handles the schema for OTP (One-Time Password) operations.
- `portfolioModel.ts`: Represents user portfolios.
- `projectModel.ts`: Represents cooperative projects.
- `proposalModel.ts`: Defines the schema for project proposals.
- `wallet.ts`: Manages user wallet details.
- `walletHistory.ts`: Tracks the history of wallet transactions.
- `withdrawal.ts`: Handles withdrawal transactions from user wallets.

### `routes/`: 
Defines the API routes that map to specific controller actions. 

- `authRoute.ts`: Routes related to authentication (login, register, etc.).
- `contactRoute.ts`: Routes related to contact information.
- `contributionRoute.ts`: Routes for managing contributions.
- `index.ts`: Main entry point for route handling.
- `membershipRoutes.ts`: Routes for handling membership features.
- `newsLetterRouter.ts`: Routes for managing newsletter subscriptions.
- `portfolioRoutes.ts`: Routes for portfolio-related actions.
- `profilePictureRoutes.ts`: Routes for managing profile picture uploads.
- `projectRoutes.ts`: Routes for project management.
- `proposalRoute.ts`: Routes for handling project proposals.
- `walletRoute.ts`: Routes for wallet-related actions.
- `withdrawalRoutes.ts`: Routes for handling withdrawals.

### `services/`: 
Contains business logic and handles operations that controllers rely on.

- `authService.ts`: Contains logic for handling user authentication.
- `contactService.ts`: Manages contact information-related business logic.
- `contributionService.ts`: Manages operations related to contributions.
- `membershipService.ts`: Handles membership-related business logic.
- `newsLetterService.ts`: Manages newsletter subscription services.
- `otpService.ts`: Handles OTP generation and verification.
- `paystackService.ts`: Contains business logic related to the Paystack payment gateway.
- `portfolioService.ts`: Deals with business logic for user portfolios.
- `profilePictureService.ts`: Handles logic related to user profile pictures.
- `projectService.ts`: Contains logic for handling project-related operations.
- `proposalService.ts`: Manages operations for project proposals.
- `walletService.ts`: Deals with wallet-related logic.
- `withdrawalService.ts`: Handles withdrawal-related operations.

### `errors/`: 
Contains error classes and handlers to manage various HTTP error responses.

- `bad-request.ts`: Handles HTTP 400 Bad Request errors.
- `conflict.ts`: Handles HTTP 409 Conflict errors.
- `custom-api.ts`: Base class for custom API errors.
- `forbidden.ts`: Handles HTTP 403 Forbidden errors.
- `index.ts`: Exports error handling utilities.
- `internal-server.ts`: Handles HTTP 500 Internal Server errors.
- `large-entity.ts`: Handles errors related to large entities (e.g., file size).
- `not-found.ts`: Handles HTTP 404 Not Found errors.
- `unauthenticated.ts`: Handles HTTP 401 Unauthenticated errors.

### `middlewares/`: 
Contains middleware logic for request processing (authentication, validation, etc.).

- `authorization.ts`: Middleware to handle user authorization.
- `errorHandler.ts`: Centralized error handling middleware.
- `notFoundMiddleWare.ts`: Middleware to handle 404 errors for routes that are not found.

### `utils/`: 
Contains utility functions used across the application.

- `bankUtils.ts`: Utility functions related to bank operations.
- `createToken.ts`: Utility to create authentication tokens (JWT).
- `deleteDoc.ts`: Utility to handle document deletion.
- `deleteDocument.ts`: Utility to handle more extensive document deletion logic.
- `extractPublicId.ts`: Extracts public ID from document URLs (used for Cloudinary or similar services).
- `imageUploader.ts`: Utility to upload images.
- `sendEmail.ts`: Handles sending emails via a configured service.
- `sendOtp.ts`: Sends OTP (One-Time Password) to users for authentication.
- `uploadDocument.ts`: Handles the process of uploading documents.

### `db/`: 
Contains database connection and migration scripts (if any).

### `templates/`: 
Contains email templates or other HTML/templated documents used in the application.


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


## Code Workflow Explanation

### 1. `withdrawalController.ts`

This file manages HTTP requests related to withdrawals. It includes two key functions:

#### `requestWithdrawal`

- **Purpose**: Handles a user’s withdrawal request.
- **Workflow**:
  1. **Extract User Data**: Retrieves the `userId` from `req.user` (assuming user data is attached to the request by authentication middleware).
  2. **Extract and Validate Input**: Extracts `amount`, `accountNumber`, and `bankCode` from `req.body`. Throws an error if any of these values are missing.
  3. **Verify Bank Details**: Uses the Paystack API to verify the bank account details:
     - Sends a GET request to Paystack's `/bank/resolve` endpoint with the account number and bank code.
     - Checks if the response contains valid bank account details.
  4. **Create Withdrawal Request**: If bank details are valid, it calls `createWithdrawalRequest` from `withdrawalService` to create a new withdrawal entry in the database.
  5. **Send Response**: Returns a success message and the created withdrawal object.

#### `updateWithdrawalStatusController`

- **Purpose**: Allows an admin to update the status of a withdrawal request.
- **Workflow**:
  1. **Extract User Data**: Retrieves `user` from `req.user` to check if the user is an admin.
  2. **Extract and Validate Input**: Extracts `withdrawalId` from `req.params` and `status` from `req.body`. Ensures the status is one of the allowed values (`pending`, `completed`, `failed`).
  3. **Check Authorization**: Verifies that the user is an admin. If not, throws a `ForbiddenError`.
  4. **Find and Update Withdrawal**:
     - Calls `findWithdrawalById` to locate the withdrawal record by ID.
     - Calls `updateWithdrawalStatus` to update the status of the withdrawal record.
  5. **Send Response**: Returns a success message and the updated withdrawal object.

### 2. `withdrawalService.ts`

This file contains business logic related to withdrawals:

#### `createWithdrawalRequest`

- **Purpose**: Creates a new withdrawal request entry in the database.
- **Workflow**:
  1. **Validate Amount**: Ensures the amount is greater than zero. Throws an error if invalid.
  2. **Create Withdrawal Record**: Uses the Mongoose model `Withdrawal` to create and save a new record with the user ID, amount, and bank details.

#### `findWithdrawalById`

- **Purpose**: Finds a withdrawal record by its ID.
- **Workflow**:
  - Uses Mongoose's `findById` method to retrieve the withdrawal record from the database.

#### `updateWithdrawalStatus`

- **Purpose**: Updates the status of a withdrawal request.
- **Workflow**:
  - Uses Mongoose's `findByIdAndUpdate` method to find the withdrawal by ID and update its status to the new value provided.

### 3. `models/withdrawal.ts`

This file defines the Mongoose schema and model for withdrawals:

#### `withdrawalSchema`

- **Purpose**: Defines the structure of a withdrawal document in the MongoDB collection.
- **Fields**:
  - `user`: Reference to the user making the withdrawal.
  - `amount`: The amount requested for withdrawal.
  - `bankDetails`: Contains `accountNumber` and `bankCode`.
  - `status`: The status of the withdrawal (`pending`, `completed`, `failed`).
  - `createdAt`: Timestamp when the withdrawal was created.

#### `Withdrawal`

- **Purpose**: The Mongoose model based on the schema, used for interacting with the `withdrawals` collection in the database.

### 4. `routes/withdrawalRoutes.ts`

This file sets up the routes for handling withdrawal-related HTTP requests:

- **Route Definitions**:
  - **`/all-banks`**: GET request to fetch all available banks (handled by `getAllBanks` from `bankController`).
  - **`/request-withdrawal`**: POST request to handle new withdrawal requests (handled by `requestWithdrawal`).
  - **`/collect-bank-details`**: POST request to collect bank details (handled by `collectBankDetails`).
  - **`/verify-bank-account`**: POST request to verify bank account details (handled by `verifyBankAccount`).
  - **`/update-status/:withdrawalId`**: PATCH request to update the status of a withdrawal request (handled by `updateWithdrawalStatusController`, accessible only by admins).

### 5. `routes/index.ts`

This file consolidates all route modules into a single export for easy inclusion in the main application file.

### Summary

- **Controllers**: Handle HTTP requests, validate input, and interact with services.
- **Services**: Implement business logic, interact with models, and perform database operations.
- **Models**: Define the schema and provide an interface to interact with the database.
- **Routes**: Define endpoints and map them to controller functions.

Each component is designed to work together to handle withdrawal requests, from user initiation and verification to admin updates and database management.

## Example Workflow: Project Management Flow

### User Initiates Project Creation

1. **User Request**: The user makes a POST request to `/create-project`, providing the project details such as title, description, and due date.

2. **Controller Handling**: The `projectController.ts` handles this request by validating the project details.

    ```ts
    export const createProject = async (req: Request, res: Response) => {
      try {
        //@ts-ignore
        const userId = req.user.userId;
        const { title, description, dueDate } = req.body;

        if (!title || !description || !dueDate) {
          throw new BadRequestError("Title, description, and due date are required");
        }

        // Create a new project
        const project = await createNewProject(userId, { title, description, dueDate });

        res.status(StatusCodes.CREATED).json({
          message: "Project created successfully",
          project,
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

3. **Service Function**: If validation is successful, the project is created and saved in the database using the `createNewProject` service function.

    ```ts
    export const createNewProject = async (userId: string, projectData: { title: string, description: string, dueDate: Date }) => {
      const project = await Project.create({ user: userId, ...projectData });
      return project;
    };
    ```

## Example Workflow

### Project Creation and Management Process

1. **User Initiates Project Creation**:
   - The user submits a request to create a new project by providing the necessary details.

2. **System Validates Project Details**:
   - The system checks the provided details to ensure they are valid and complete.

3. **Create Project**:
   - If the details are valid, the system creates a new project and saves it in the database.

4. **Admin Updates Project Status**:
   - An authorized admin can update the status of the project based on its progress (e.g., active, completed, archived).

This workflow ensures that projects are efficiently managed and that all necessary information is captured for successful execution.

## Code Workflow Explanation

### 1. `projectController.ts`

This file manages HTTP requests related to project management. It includes two key functions:

#### `createProject`

- **Purpose**: Handles a user’s request to create a new project.
- **Workflow**:
  1. **Extract User Data**: Retrieves the `userId` from `req.user` (assuming user data is attached to the request by authentication middleware).
  2. **Extract and Validate Input**: Extracts `title`, `description`, and `dueDate` from `req.body`. Throws an error if any of these values are missing.
  3. **Create Project**: If the input is valid, it calls `createNewProject` from `projectService` to create a new project entry in the database.
  4. **Send Response**: Returns a success message and the created project object.

#### `updateProjectStatusController`

- **Purpose**: Allows an admin to update the status of a project.
- **Workflow**:
  1. **Extract User Data**: Retrieves `user` from `req.user` to check if the user is an admin.
  2. **Extract and Validate Input**: Extracts `projectId` from `req.params` and `status` from `req.body`. Ensures the status is one of the allowed values (`active`, `completed`, `archived`).
  3. **Check Authorization**: Verifies that the user is an admin. If not, throws a `ForbiddenError`.
  4. **Find and Update Project**:
     - Calls `findProjectById` to locate the project record by ID.
     - Calls `updateProjectStatus` to update the status of the project record.
  5. **Send Response**: Returns a success message and the updated project object.

### 2. `projectService.ts`

This file contains business logic related to projects:

#### `createNewProject`

- **Purpose**: Creates a new project entry in the database.
- **Workflow**:
  1. **Create Project Record**: Uses the Mongoose model `Project` to create and save a new record with the user ID and project data.

#### `findProjectById`

- **Purpose**: Finds a project record by its ID.
- **Workflow**:
  - Uses Mongoose's `findById` method to retrieve the project record from the database.

#### `updateProjectStatus`

- **Purpose**: Updates the status of a project.
- **Workflow**:
  - Uses Mongoose's `findByIdAndUpdate` method to find the project by ID and update its status to the new value provided.

### 3. `models/project.ts`

This file defines the Mongoose schema and model for projects:

#### `projectSchema`

- **Purpose**: Defines the structure of a project document in the MongoDB collection.
- **Fields**:
  - `user`: Reference to the user who created the project.
  - `title`: The title of the project.
  - `description`: A brief description of the project.
  - `dueDate`: The due date for project completion.
  - `status`: The status of the project (`active`, `completed`, `archived`).
  - `createdAt`: Timestamp when the project was created.

#### `Project`

- **Purpose**: The Mongoose model based on the schema, used for interacting with the `projects` collection in the database.

### 4. `routes/projectRoutes.ts`

This file sets up the routes for handling project-related HTTP requests:

- **Route Definitions**:
  - **`/create-project`**: POST request to handle new project creation (handled by `createProject`).
  - **`/update-status/:projectId`**: PATCH request to update the status of a project (handled by `updateProjectStatusController`, accessible only by admins).

### 5. `routes/index.ts`

This file consolidates all route modules into a single export for easy inclusion in the main application file.

### Summary

- **Controllers**: Handle HTTP requests, validate input, and interact with services.
- **Services**: Implement business logic, interact with models, and perform database operations.
- **Models**: Define the schema and provide an interface to interact with the database.
- **Routes**: Define endpoints and map them to controller functions.

Each component is designed to work together to manage projects, from user initiation and validation to admin updates and database management.


# Membership Activation Feature Workflow

## Example Workflow: Membership Activation Flow

### User Initiates Membership Activation

1. **User Request**: The user makes a POST request to `/activate-membership`, providing their membership details and payment information.

2. **Controller Handling**: The `membershipController.ts` handles this request by validating the membership details.

    ```ts
    import { Request, Response } from "express";
    import { activateMembershipService } from "../services/membershipService";
    import { BadRequestError } from "../errors";
    import { StatusCodes } from "http-status-codes";

    export const activateMembership = async (req: Request, res: Response) => {
      try {
        const { membershipType, paymentDetails } = req.body;
        //@ts-ignore
        const userId = req.user.userId;

        // Validate membership details
        if (!membershipType || !paymentDetails) {
          throw new BadRequestError("Membership type and payment details are required");
        }

        // Activate the membership
        const membership = await activateMembershipService(userId, membershipType, paymentDetails);

        // Respond to the client
        res.status(StatusCodes.CREATED).json({
          message: "Membership activated successfully",
          membership,
        });
      } catch (error) {
        console.error(error);
        res.status(error instanceof BadRequestError ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR).json({ error: (error as Error).message });
      }
    };
    ```

3. **Service Function**: If validation is successful, the membership is activated and saved in the database using the `activateMembershipService` function.

    ```ts
    import Membership from "../models/membership";

    export const activateMembershipService = async (userId: string, membershipType: string, paymentDetails: any) => {
      // Logic to process payment and activate membership
      const membership = await Membership.create({
        user: userId,
        membershipType,
        paymentDetails,
        status: "Active",
      });
      return membership;
    };
    ```

## Example Workflow

### Membership Activation Process

1. **User Initiates Membership Activation**:
   - The user submits a request to activate their membership by providing the necessary details.

2. **System Validates Membership Details**:
   - The system checks the provided membership details to ensure they are valid and complete.

3. **Activate Membership**:
   - If the details are valid, the system activates the membership and saves it in the database.

4. **Respond to User**:
   - The system responds with a confirmation of the activated membership.

This workflow ensures that memberships are efficiently managed and that all necessary information is captured for successful activation.

## Code Workflow Explanation

### 1. `membershipController.ts`

This file manages HTTP requests related to membership activation. It includes the key function:

#### `activateMembership`

- **Purpose**: Handles a user’s request to activate their membership.
- **Workflow**:
  1. **Extract User Data**: Retrieves the `userId` from `req.user` (assuming user data is attached to the request by authentication middleware).
  2. **Extract and Validate Input**: Extracts `membershipType` and `paymentDetails` from `req.body`. Throws an error if any of these values are missing.
  3. **Activate Membership**: If the input is valid, it calls `activateMembershipService` from `membershipService` to activate the membership.
  4. **Send Response**: Returns a success message and the activated membership object.

### 2. `membershipService.ts`

This file contains business logic related to memberships:

#### `activateMembershipService`

- **Purpose**: Activates a membership for a user.
- **Workflow**:
  1. **Create Membership Record**: Uses the Mongoose model `Membership` to create and save a new record with the user ID, membership type, payment details, and status.

### 3. `models/membership.ts`

This file defines the Mongoose schema and model for memberships:

#### `membershipSchema`

- **Purpose**: Defines the structure of a membership document in the MongoDB collection.
- **Fields**:
  - `user`: Reference to the user who activated the membership.
  - `membershipType`: The type of membership (e.g., Basic, Premium).
  - `paymentDetails`: Details related to the payment for the membership.
  - `status`: The status of the membership (`Active`, `Inactive`).
  - `createdAt`: Timestamp when the membership was created.

#### `Membership`

- **Purpose**: The Mongoose model based on the schema, used for interacting with the `memberships` collection in the database.

### 4. `routes/membershipRoutes.ts`

This file sets up the routes for handling membership-related HTTP requests:

- **Route Definitions**:
  - **`/activate-membership`**: POST request to handle membership activation (handled by `activateMembership`).

### 5. `routes/index.ts`

This file consolidates all route modules into a single export for easy inclusion in the main application file.

### Summary

- **Controllers**: Handle HTTP requests, validate input, and interact with services.
- **Services**: Implement business logic, interact with models, and perform database operations.
- **Models**: Define the schema and provide an interface to interact with the database.
- **Routes**: Define endpoints and map them to controller functions.

Each component is designed to work together to manage membership activation, from user initiation and validation to successful activation and database management.

# Contribution Feature Workflow

## Example Workflow: Contribution Management Flow

### User Initiates Contribution

1. **User Request**: The user makes a POST request to `/contribute`, providing the payment plan, contribution plan, and amount.

2. **Controller Handling**: The `contributionController.ts` manages this request by validating user input and wallet balance.

    ```ts
    export const createContribution = async (req: Request, res: Response) => {
      try {
        const { paymentPlan, contributionPlan, amount } = req.body;
        //@ts-ignore
        const userId = req.user.userId;

        // Fetch the user's wallet
        const wallet = await findWalletService({ user: userId });
        if (!wallet) {
          throw new BadRequestError("Wallet not found");
        }

        // Check wallet balance
        if (wallet.balance < amount) {
          throw new BadRequestError("Insufficient funds in the wallet");
        }

        // Create the contribution
        const contribution = await createContributionService({
          user: userId,
          paymentPlan,
          contributionPlan,
          amount,
          _id: undefined,
          nextContributionDate: undefined // Adjust as needed
        });

        // Deduct the contribution amount from the wallet
        const updatedWallet = await updateWalletService(wallet._id, { balance: wallet.balance - amount });
        if (!updatedWallet) {
          throw new BadRequestError("Failed to update wallet balance");
        }

        // Log the contribution history
        await createContributionHistoryService(contribution._id.toString(), userId, amount, "Pending");

        // Respond to the client
        res.status(StatusCodes.CREATED).json({ message: "Contribution created successfully", contribution });
      } catch (error) {
        console.error(error);
        res.status(error instanceof BadRequestError ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR).json({ error: (error as Error).message });
      }
    };
    ```

3. **Service Function**: If validation is successful, the contribution is created, and the wallet is updated using the `createContributionService` and `updateWalletService`.

    ```ts
    export const createContributionService = async (payload: iContribution) => {
      return await Contribution.create(payload);
    };
    ```

## Example Workflow

### Contribution Creation and Management Process

1. **User Initiates Contribution**:
   - The user submits a request to contribute by providing the necessary details.

2. **System Validates Wallet and Contribution Details**:
   - The system checks the user's wallet for sufficient balance and validates the contribution details.

3. **Create Contribution**:
   - If the wallet has sufficient funds, the system creates a new contribution and saves it in the database.

4. **Log Contribution History**:
   - The system logs the contribution in the contribution history for future reference.

5. **Admin and User Access**:
   - Users can check their contribution history and details of their contributions.

This workflow ensures that contributions are managed securely and efficiently.

## Code Workflow Explanation

### 1. `contributionController.ts`

This file manages HTTP requests related to contributions. It includes three key functions:

#### `createContribution`

- **Purpose**: Handles a user’s request to create a new contribution.
- **Workflow**:
  1. **Extract User Data**: Retrieves the `userId` from `req.user`.
  2. **Fetch Wallet**: Looks for the user's wallet and checks its balance.
  3. **Create Contribution**: If the balance is sufficient, creates a new contribution and updates the wallet balance.
  4. **Log Contribution History**: Logs the contribution in the history.
  5. **Send Response**: Returns a success message and the created contribution object.

#### `getContributionDetails`

- **Purpose**: Retrieves the latest contribution details for the user.
- **Workflow**:
  1. **Extract User Data**: Retrieves `userId` from `req.user`.
  2. **Fetch Contribution**: Looks for the most recent contribution record.
  3. **Send Response**: Returns the balance and next contribution date.

#### `getContributionHistory`

- **Purpose**: Retrieves the contribution history for the user.
- **Workflow**:
  1. **Extract User Data**: Retrieves `userId` from `req.user`.
  2. **Fetch History**: Calls `findContributionHistoryService` to get the user's contribution history.
  3. **Send Response**: Returns the contribution history.

### 2. `models/contribution.ts`

This file defines the Mongoose schema and model for contributions:

#### `ContributionSchema`

- **Purpose**: Defines the structure of a contribution document in the MongoDB collection.
- **Fields**:
  - `user`: Reference to the user making the contribution.
  - `paymentPlan`: The payment plan type (e.g., Instalment, PayOnce).
  - `contributionPlan`: The frequency of contributions (e.g., Daily, Weekly, Monthly, Yearly).
  - `amount`: The amount contributed.
  - `balance`: The remaining balance after contributions.
  - `nextContributionDate`: The date of the next scheduled contribution.
  - `status`: The status of the contribution (e.g., Pending, Completed).

### 3. `models/contributionHistory.ts`

This file defines the Mongoose schema and model for contribution history:

#### `ContributionHistorySchema`

- **Purpose**: Defines the structure of a contribution history document in the MongoDB collection.
- **Fields**:
  - `contribution`: Reference to the associated contribution.
  - `user`: Reference to the user making the contribution.
  - `amount`: The amount contributed.
  - `status`: The current status of the contribution (e.g., Pending, Completed).
  - `date`: The date the contribution was made.

### 4. `services/contributionService.ts`

This file contains business logic related to contributions:

#### `createContributionService`

- **Purpose**: Creates a new contribution entry in the database.
- **Workflow**:
  - Uses the Mongoose model `Contribution` to create and save a new record.

#### `findContributionHistoryService`

- **Purpose**: Finds the contribution history for a user.
- **Workflow**:
  - Uses Mongoose's `find` method to retrieve the contribution history records.

### 5. `routes/contributionRoutes.ts`

This file sets up the routes for handling contribution-related HTTP requests:

- **Route Definitions**:
  - **`/contribute`**: POST request to handle new contributions (handled by `createContribution`).
  - **`/history`**: GET request to fetch contribution history (handled by `getContributionHistory`).
  - **`/balance`**: GET request to fetch contribution details (handled by `getContributionDetails`).

### 6. `routes/index.ts`

This file consolidates all route modules into a single export for easy inclusion in the main application file.

### Summary

- **Controllers**: Handle HTTP requests, validate input, and interact with services.
- **Services**: Implement business logic, interact with models, and perform database operations.
- **Models**: Define the schema and provide an interface to interact with the database.
- **Routes**: Define endpoints and map them to controller functions.

Each component is designed to work together to manage contributions, from user initiation and validation to logging and historical records.


# API Endpoints Documentation

You can check all the API endpoints by visiting the following link:

[API Endpoints Documentation](https://documenter.getpostman.com/view/27189273/2sA3JFA4bj#877715d5-f3cf-4b24-9fec-5ff9571db864)

This documentation includes details on all available API endpoints, their methods, required parameters, and sample requests/responses.

## Contributing

Contributions to this project are restricted to the internal development team. If you are part of the team and would like to contribute, please follow these steps:

1. **Clone the Repository:** Clone the repository to your local machine.
2. **Create a New Branch:** Create a new branch for your feature or bug fix.
3. **Develop Your Changes:** Implement your changes and ensure they are tested.
4. **Submit a Pull Request:** Submit a pull request to the `Dev` branch for review. Ensure that your PR includes a detailed description of the changes made and any relevant issues it addresses.
5. **Code Review:** Wait for the code review and make any necessary adjustments based on feedback.

For major changes, please discuss them with the team first by opening an issue or scheduling a meeting.

## License

This project is licensed under the MIT License. As this is a private repository, access to the source code is limited to authorized contributors.
