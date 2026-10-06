import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { apiReference } from '@scalar/express-api-reference';
import { buildOpenApiDocument } from './openapi';

export const docsRoutes = Router();

const openApiDocument = buildOpenApiDocument();

docsRoutes.get('/openapi.json', (_req, res) => {
  res.json(openApiDocument);
});

docsRoutes.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    customSiteTitle: 'API do auth.system',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      defaultModelsExpandDepth: 1,
    },
  }),
);

docsRoutes.use(
  '/reference',
  apiReference({
    spec: { content: openApiDocument },
    theme: 'purple',
    pageTitle: 'API do auth.system',
  }),
);
