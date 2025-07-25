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

// Generic OAuth authorization server metadata endpoint (proxies to Cognito)
app.get('/.well-known/oauth-authorization-server', async (req, res) => {
  try {
    // Proxy request to the actual Cognito authorization server metadata
    const axios = require('axios');
    
    // Cognito uses OpenID Connect configuration, not OAuth authorization server endpoint
    // Convert the configured auth server URL to the correct OpenID configuration endpoint
    authMetadataUrl = config.cognito.authServerUrl;
    if (config.mcpServer.user_external_auth == 'external_auth') {
      authMetadataUrl = config.oauth.authServerUrl;
    }
    console.log(`Original Auth Metadata URL: ${authMetadataUrl}`);
    // If the configured URL points to oauth-authorization-server, change it to openid-configuration
    if (authMetadataUrl.includes('/.well-known/oauth-authorization-server')) {
      authMetadataUrl = authMetadataUrl.replace('/.well-known/oauth-authorization-server', '/.well-known/openid-configuration');
    }
    // If it doesn't have any well-known endpoint, add the OpenID configuration one
    else if (!authMetadataUrl.includes('/.well-known/')) {
      authMetadataUrl = `${authMetadataUrl}/.well-known/openid-configuration`;
    }
    
    console.log(`Proxying authorization server metadata request to: ${authMetadataUrl}`);
    const response = await axios.get(authMetadataUrl);
    
    // Add registration_endpoint to the metadata for RFC 8414 compliance
    const metadata = response.data;
    metadata.registration_endpoint = process.env.DCR_ENDPOINT;
    
    res.json(metadata);
  } catch (error) {
    console.error('Error proxying authorization server metadata:', error.message);
    res.status(500).json({
      error: 'server_error',
      error_description: 'Unable to retrieve authorization server metadata'
    });
  }
});


// Middleware to validate access tokens
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).set({
      'WWW-Authenticate': `Bearer resource_metadata="${config.mcpServer.baseUrl}/.well-known/oauth-protected-resource"`
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
      'WWW-Authenticate': `Bearer resource_metadata="${config.mcpServer.baseUrl}/.well-known/oauth-protected-resource", error="invalid_token", error_description="${error.message}"`
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
  console.log(`Authorization Server Metadata (includes registration_endpoint): http://localhost:${PORT}/.well-known/oauth-authorization-server`);
});
