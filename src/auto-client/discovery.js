const axios = require('axios');

/**
 * Perform MCP Server discovery with auto-discovery of authorization server
 * @param {string} mcpServerUrl - The URL of the MCP server
 * @returns {Promise<Object>} - Information about the authorization server
 */
async function discovery(mcpServerUrl) {
  try {
    console.log(`Making initial request to MCP server: ${mcpServerUrl}`);
    
    // Make a request to the MCP server that will return a 401
    await axios.get(`${mcpServerUrl}/v1/contexts`);
    
    // If we get here, something is wrong - we expected a 401
    throw new Error('Expected 401 response not received from MCP server');
  } catch (error) {
    // Expected 401 error with WWW-Authenticate header
    if (error.response && error.response.status === 401) {
      const wwwAuthHeader = error.response.headers['www-authenticate'];
      
      if (!wwwAuthHeader) {
        throw new Error('WWW-Authenticate header missing from 401 response');
      }
      
      console.log('Received WWW-Authenticate header:', wwwAuthHeader);
      
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
      
      // For AWS Cognito, we need to modify the URL to use the OpenID Connect configuration
      // Cognito doesn't support the standard oauth-authorization-server endpoint
      let authServerMetadataUrl;
      
      // Check if this is a Cognito URL
      if (authServerUrl.includes('cognito-idp') || authServerUrl.includes('amazonaws.com')) {
        // For Cognito, extract the region and user pool ID
        let region = 'us-east-1'; // Default
        let userPoolId = '';
        
        // Try to extract from URL if possible
        const cognitoUrlMatch = authServerUrl.match(/https:\/\/cognito-idp\.([^.]+)\.amazonaws\.com\/([^/]+)/);
        if (cognitoUrlMatch) {
          region = cognitoUrlMatch[1];
          userPoolId = cognitoUrlMatch[2];
        } else {
          // Try to extract user pool ID from the path
          const pathMatch = authServerUrl.match(/([a-z0-9-_]+_[A-Za-z0-9]+)/);
          if (pathMatch) {
            userPoolId = pathMatch[1];
          }
        }
        
        if (!userPoolId) {
          throw new Error('Could not determine Cognito User Pool ID from authorization server URL');
        }
        
        // Construct the OpenID configuration URL
        authServerMetadataUrl = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/openid-configuration`;
        console.log(`Using Cognito OpenID configuration URL: ${authServerMetadataUrl}`);
      } else {
        // For non-Cognito auth servers, use standard OAuth metadata endpoint
        authServerMetadataUrl = authServerUrl;
        if (!authServerMetadataUrl.endsWith('/.well-known/oauth-authorization-server')) {
          authServerMetadataUrl = `${authServerUrl}/.well-known/oauth-authorization-server`;
        }
      }
      
      // Fetch the authorization server metadata
      try {
        console.log(`Fetching auth server metadata from: ${authServerMetadataUrl}`);
        const authServerMetadataResponse = await axios.get(authServerMetadataUrl);
        const authServerMetadata = authServerMetadataResponse.data;
        
        console.log('Authorization Server Metadata:', authServerMetadata);
        
        return {
          resourceMetadata,
          authServerMetadata,
          authServerUrl
        };
      } catch (authServerError) {
        console.error('Error fetching authorization server metadata:', authServerError.message);
        if (authServerError.response) {
          console.error('Status:', authServerError.response.status);
          console.error('Response:', authServerError.response.data);
        }
        throw new Error(`Failed to fetch authorization server metadata: ${authServerError.message}`);
      }
    } else {
      console.error('Unexpected error during discovery:', error);
      throw new Error(`Unexpected response from MCP server: ${error.message}`);
    }
  }
}

module.exports = {
  discovery
};