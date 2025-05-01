const express = require('express');
const cors = require('cors');
const { createResourceMetadata } = require('./resource-metadata');
const { validateToken } = require('./token-validator');
const config = require('../shared/config');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Log MCP-Protocol-Version header if present
app.use((req, res, next) => {
  const mcpVersion = req.headers['mcp-protocol-version'];
  if (mcpVersion) {
    console.log(`MCP-Protocol-Version: ${mcpVersion}`);
  }
  next();
});

// Protected Resource Metadata endpoint
app.get('/.well-known/oauth-protected-resource', (req, res) => {
  const metadata = createResourceMetadata();
  res.json(metadata);
});

app.get('/.well-known/oauth-dynamic-client-registration', (req, res) => {
  res.json({
    registration_endpoint: process.env.DCR_ENDPOINT || 'https://api-gateway-url/v1/register',
    registration_endpoint_auth_methods_supported: ['none'],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    service_documentation: `${config.baseUrl}/docs/dcr`
  });
});

// Middleware to validate access tokens
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).set({
      'WWW-Authenticate': `Bearer resource_metadata="${config.baseUrl}/.well-known/oauth-protected-resource"`
    }).json({
      error: 'unauthorized',
      error_description: 'Valid bearer token required'
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decodedToken = await validateToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token validation failed:', error.message);
    return res.status(401).set({
      'WWW-Authenticate': `Bearer resource_metadata="${config.baseUrl}/.well-known/oauth-protected-resource", error="invalid_token", error_description="${error.message}"`
    }).json({
      error: 'unauthorized',
      error_description: error.message
    });
  }
};

// MCP API endpoints
app.get('/v1/contexts', requireAuth, (req, res) => {
  // This would typically fetch data from a database
  const contexts = [
    {
      id: 'ctx_123456',
      name: 'Default Context',
      created_at: new Date().toISOString()
    }
  ];
  
  res.json(contexts);
});

app.post('/v1/contexts', requireAuth, (req, res) => {
  // Create a new context (in a real app, would save to database)
  const newContext = {
    id: `ctx_${Date.now()}`,
    name: req.body.name || 'New Context',
    created_at: new Date().toISOString()
  };
  
  res.status(201).json(newContext);
});

// Start server
app.listen(PORT, () => {
  console.log(`MCP Server running on port ${PORT}`);
  console.log(`Protected Resource Metadata available at: http://localhost:${PORT}/.well-known/oauth-protected-resource`);
  console.log(`DCR Metadata available at: http://localhost:${PORT}/.well-known/oauth-dynamic-client-registration`);
});
