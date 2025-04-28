const axios = require('axios');
const config = require('../shared/config');

async function discovery(mcpServerUrl) {
  try {
    console.log(`Making initial request to MCP server: ${mcpServerUrl}`);
    await axios.get(`${mcpServerUrl}/v1/contexts`);
  } catch (error) {
    // Expected 401 error with WWW-Authenticate header
    if (error.response && error.response.status === 401) {
      const wwwAuthHeader = error.response.headers['www-authenticate'];
      
      if (!wwwAuthHeader) {
        throw new Error('WWW-Authenticate header missing from 401 response');
      }
      
      // Extract resource_metadata URL from the header
      const resourceMetadataMatch = wwwAuthHeader.match(/resource_metadata="([^"]+)"/);
      
      if (!resourceMetadataMatch) {
        throw new Error('resource_metadata not found in WWW-Authenticate header');
      }
      
      const resourceMetadataUrl = resourceMetadataMatch[1];
      const fullResourceMetadataUrl = resourceMetadataUrl.startsWith('http') 
        ? resourceMetadataUrl 
        : `${mcpServerUrl}${resourceMetadataUrl}`;
      
      console.log(`Discovered resource metadata URL: ${fullResourceMetadataUrl}`);
      
      // Fetch the resource metadata
      const resourceMetadataResponse = await axios.get(fullResourceMetadataUrl);
      const resourceMetadata = resourceMetadataResponse.data;
      
      if (!resourceMetadata.authorization_servers || resourceMetadata.authorization_servers.length === 0) {
        throw new Error('No authorization servers found in resource metadata');
      }
      
      // Use the first authorization server
      const authServerUrl = resourceMetadata.authorization_servers[0];
      console.log(`Discovered authorization server: ${authServerUrl}`);
      
      // Construct the authorization server metadata manually for Cognito
      const authServerMetadata = {
        issuer: config.cognito.issuer,
        authorization_endpoint: `https://${config.cognito.domain}.auth.${config.cognito.region}.amazoncognito.com/oauth2/authorize`,
        token_endpoint: `https://${config.cognito.domain}.auth.${config.cognito.region}.amazoncognito.com/oauth2/token`,
        jwks_uri: `${config.cognito.issuer}/.well-known/jwks.json`
      };
      
      console.log('Constructed Authorization Server Metadata:', authServerMetadata);
      
      return {
        resourceMetadata,
        authServerMetadata,
        authServerUrl
      };
    } else {
      console.error('Unexpected error during discovery:', error);
      throw new Error(`Unexpected response from MCP server: ${error.message}`);
    }
  }
  
  throw new Error('Expected 401 response not received from MCP server');
}

module.exports = {
  discovery
};