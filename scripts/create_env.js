const fs = require("fs");
const path = require("path");
require("dotenv").config();

function createEnvFiles() {
  // Base path
  const basePath = path.dirname(__dirname);

  // Create client .env file
  const clientEnv = `# Client Configuration
PORT=3000
CLIENT_URL=http://localhost:3000

# MCP Server URL
MCP_SERVER_URL=http://localhost:3001

OAUTH_CLIENT_ID=your-client-id
OAUTH_CLIENT_SECRET=your-client-secret
AUTH_SERVER_URL=your-auth-server-discovery-url

# OAuth Configuration
OAUTH_REDIRECT_URI=http://localhost:3000/callback
OAUTH_SCOPE=openid profile email
`;

  // Create auto-client .env file
  const autoClientEnv = `# Auto Client Configuration
AUTO_CLIENT_PORT=3002
AUTO_CLIENT_URL=http://localhost:3002

# MCP Server URL
MCP_SERVER_URL=http://localhost:3001

# Dynamic Client Registration Endpoint
DCR_ENDPOINT=your-dcr-endpoint-url
`;

  // Create server .env file
  const serverEnv = `# Server Configuration
PORT=3001
BASE_URL=http://localhost:3001

OAUTH_CLIENT_ID=your-client-id
OAUTH_CLIENT_SECRET=your-client-secret
AUTH_SERVER_URL=your-auth-server-discovery-url
MCP_SERVER_USER_EXTERNAL_AUTH=external_auth

# Dynamic Client Registration Endpoint
DCR_ENDPOINT=your-dcr-endpoint-url
`;

  // Ensure directories exist
  ensureDirectoryExists(path.join(basePath, "src", "client"));
  ensureDirectoryExists(path.join(basePath, "src", "auto-client"));
  ensureDirectoryExists(path.join(basePath, "src", "mcp-server"));

  // Write the .env files
  fs.writeFileSync(path.join(basePath, "src", "client", ".env"), clientEnv);
  fs.writeFileSync(
    path.join(basePath, "src", "auto-client", ".env"),
    autoClientEnv
  );
  fs.writeFileSync(path.join(basePath, "src", "mcp-server", ".env"), serverEnv);

  console.log("Created .env files for client, auto-client, and server");
}

function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

// Run the deployment
createEnvFiles();
console.log("Environment files created successfully!");
