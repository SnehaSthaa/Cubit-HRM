import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Harmony HR API",
      version: "1.0.0",
      description: "API documentation for HR system",
    },
    servers: [
      {
        url: "http://localhost:3000",
      },
    ],
  },
  apis: ["src/routes/**/*.ts"], // better
};

export const swaggerSpec = swaggerJsdoc(options);