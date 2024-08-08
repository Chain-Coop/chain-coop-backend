# Chain-Coop-Backend

Chain-Coop-Backend is the backend service for the Chain Cooperative platform, which allows users to manage projects, portfolios, contributions, shares, and proposals. This service is built using Node.js, Express, and MongoDB, and leverages Cloudinary for file storage.

## Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
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

# API Endpoints

## Auth
- **POST** `/auth/register` - Register a new user
- **POST** `/auth/login` - Login a user

## Projects
- **POST** `/projects/create` - Create a new project
- **GET** `/projects/user` - Get projects for a specific user

## Portfolios
- **POST** `/portfolios/create` - Create a new portfolio
- **GET** `/portfolios/user` - Get portfolios for a specific user

## Proposals
- **POST** `/proposals/create` - Create a new proposal
- **GET** `/proposals/user` - Get proposals for a specific user
- **GET** `/proposals` - Get all proposals (admin only)
- **GET** `/proposals/:id` - Get a proposal by ID
- **PUT** `/proposals/:id` - Update a proposal by ID
- **DELETE** `/proposals/:id` - Delete a proposal by ID

