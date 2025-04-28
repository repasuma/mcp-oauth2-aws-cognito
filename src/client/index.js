const express = require('express');
const session = require('express-session');
const { discovery } = require('./discovery');
const { initiateAuthFlow, handleCallback, refreshToken } = require('./auth-flow');
const { getMcpData } = require('./mcp-api');
const config = require('../shared/config');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'mcp-oauth-demo-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true in production with HTTPS
}));

// Home page
app.get('/', (req, res) => {
  const isAuthenticated = req.session.tokens && req.session.tokens.access_token;
  
  res.send(`
    <h1>MCP OAuth 2.1 Demo Client</h1>
    ${isAuthenticated 
      ? '<p>Status: Authenticated</p>'
      : '<p>Status: Not authenticated</p>'}
    <div>
      ${isAuthenticated 
        ? '<a href="/mcp-data"><button>Fetch MCP Data</button></a>' 
        : '<a href="/login"><button>Log in</button></a>'}
      ${isAuthenticated 
        ? '<a href="/logout"><button>Log out</button></a>' 
        : ''}
    </div>
  `);
});

// Initiate login
app.get('/login', async (req, res) => {
  try {
    // Start the discovery process
    const authServerInfo = await discovery(config.mcpServer.baseUrl);
    
    // Store discovered info in session
    req.session.authServerInfo = authServerInfo;
    
    // Initiate the authentication flow
    const authUrl = await initiateAuthFlow(authServerInfo);
    
    // Redirect to the authorization server
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error starting auth flow:', error);
    res.status(500).send(`Error starting authentication: ${error.message}`);
  }
});

// OAuth callback handler
app.get('/callback', async (req, res) => {
  const { code } = req.query;
  const { authServerInfo } = req.session;
  
  if (!code || !authServerInfo) {
    return res.status(400).send('Missing authorization code or server info');
  }
  
  try {
    // Exchange code for tokens
    const tokens = await handleCallback(code, authServerInfo);
    
    // Store tokens in session
    req.session.tokens = tokens;
    
    // Redirect to home page
    res.redirect('/');
  } catch (error) {
    console.error('Error handling callback:', error);
    res.status(500).send(`Error exchanging code for token: ${error.message}`);
  }
});

app.get('/.well-known/oauth-protected-resource', (req, res) => {
    res.json({
      resource: config.baseUrl,
      authorization_servers: [
        config.cognito.authServerUrl
      ],
      bearer_methods_supported: ["header"],
      scopes_supported: [
        "openid",
        "profile",
        "email",
        "mcp-api/read",
        "mcp-api/write"
      ],
      resource_documentation: `${config.baseUrl}/docs`
    });
});

// Fetch MCP data
app.get('/mcp-data', async (req, res) => {
  const { tokens } = req.session;
  
  if (!tokens || !tokens.access_token) {
    return res.redirect('/login');
  }
  
  try {
    // Check if token is expired and refresh if needed
    if (tokens.expires_at && Date.now() > tokens.expires_at) {
      const newTokens = await refreshToken(tokens.refresh_token, req.session.authServerInfo);
      req.session.tokens = newTokens;
    }
    
    // Make API call to MCP server
    const mcpData = await getMcpData(tokens.access_token);
    
    res.send(`
      <h1>MCP Data</h1>
      <pre>${JSON.stringify(mcpData, null, 2)}</pre>
      <a href="/"><button>Back to Home</button></a>
    `);
  } catch (error) {
    console.error('Error fetching MCP data:', error);
    
    if (error.response && error.response.status === 401) {
      // Token is invalid, redirect to login
      return res.redirect('/login');
    }
    
    res.status(500).send(`Error fetching MCP data: ${error.message}`);
  }
});

// Logout
app.get('/logout', (req, res) => {
  // Clear session
  req.session.destroy();
  res.redirect('/');
});

// Start server
app.listen(PORT, () => {
  console.log(`MCP Client running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to start`);
});

