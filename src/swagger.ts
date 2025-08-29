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
        url: 'https://api.chaincoop.org/api/v1',
      },
      {
        url: 'https://little-frost.pipeops.app/api/v1',
      },
      {
        url: 'https://puffy-knowledge.pipeops.app/api/v1',
      },
      {
        url: 'http://localhost:3000/api/v1',
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
