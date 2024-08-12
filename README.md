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

# API Endpoints Documentation

You can check all the API endpoints by visiting the following link:

[API Endpoints Documentation](https://documenter.getpostman.com/view/27189273/2sA3JFA4bj#877715d5-f3cf-4b24-9fec-5ff9571db864)

This documentation includes details on all available API endpoints, their methods, required parameters, and sample requests/responses.

## Environment Variables

The following environment variables need to be set in your `.env` file:

```sh
MONGO_URI=<your_mongodb_uri>
CLOUDINARY_CLOUD_NAME=<your_cloudinary_cloud_name>
CLOUDINARY_API_KEY=<your_cloudinary_api_key>
CLOUDINARY_API_SECRET=<your_cloudinary_api_secret>
JWT_SECRET=<your_jwt_secret>
```

Ensure that you keep these variables secure and do not share them publicly, especially since this is a private repository.

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
