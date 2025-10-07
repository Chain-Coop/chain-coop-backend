import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { url } from 'inspector';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Chain Coop Backend API',
      version: '1.0.0',
      description: 'API documentation for Chain Coop Backend',
    },
    servers: [
      {
        url: 'http://localhost:3001/api/v1',
        description: 'Local development server',
      },
      {
        url: 'https://api.chaincoop.org/api/v1',
        description: 'Production server',
      },
      {
        url: 'https://little-frost.pipeops.app/api/v1',
        description: 'Staging server 1',
      },
      {
        url: 'https://puffy-knowledge.pipeops.app/api/v1',
        description: 'Staging server 2',
      },
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Alternative local server',
      },
    ],
  },
  apis: ['./src/routes/**/*.ts', './src/controllers/**/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
  const handlers = [
    ...(swaggerUi.serve as any[]),
    swaggerUi.setup(swaggerSpec),
  ];
  app.use('/api-docs', ...handlers);
};
