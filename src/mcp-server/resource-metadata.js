const config = require('../shared/config');

function createResourceMetadata() {
  return {
    resource: config.baseUrl,
    authorization_servers: [
      config.cognito.authServerUrl
    ],
    bearer_methods_supported: [
      "header"
    ],
    scopes_supported: [
      "openid",
      "profile",
      "email",
      "mcp-api/read",
      "mcp-api/write"
    ],
    resource_documentation: `${config.baseUrl}/docs`
  };
}

module.exports = {
  createResourceMetadata
};
