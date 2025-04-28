# MCP + OAuth 2.1 + AWS Cognito Setup Guide

This guide walks through setting up and running the MCP OAuth 2.1 demo with AWS Cognito. The project demonstrates a complete implementation of the Model Context Protocol (MCP) authorization flow using OAuth 2.1 with AWS Cognito as the Authorization Server.
## Detailed Configuration Steps

### Prerequisites

- AWS Account with IAM permissions
- Node.js 18+ 
- AWS CLI configured with credentials
- Basic understanding of OAuth 2.1 and AWS Cognito

### Environment Setup

1. **AWS Credentials**
   - Configure AWS CLI: `aws configure`
   - Ensure you have permissions to create:
     * Cognito User Pools
     * IAM Roles

2. **Clone the Repository**

   ```bash
   git clone https://github.com/empires-security/mcp-oauth2-aws-cognito.git
   cd mcp-oauth2-aws-cognito
   ```

3. **Node.js Dependencies**
   ```bash
   npm run install:all
   ```

4. **Deploy Cognito Resources**
   ```bash
   npm run deploy:cognito
   ```

5. **Environment Configuration**
   - Review generated `.env` files in:
     * `src/client/.env`
     * `src/mcp-server/.env`
   - Compare with `.env.example` files
   - Manually verify/update CLIENT_SECRET if needed

## Running the Application

### 1. Run both Server and Client
```bash
npm run dev
```

### 2. MCP Server

- Run the MCP server locally.
- Ensure it serves a `.well-known/oauth-protected-resource` endpoint with links to Cognito Authorization Server.

### 3. Client

- Run the example client.
- It will:
  - Discover the Authorization Server.
  - Redirect user for authentication via browser.
  - Obtain an access token.
  - Access protected MCP server endpoints.

## Project Structure

```
/mcp-server
  - Minimal protected resource server
  - Serves /.well-known/oauth-protected-resource

/client
  - Example client to demonstrate the OAuth 2.1 flow
  - Handles discovery, PKCE, and token usage

/docs
  - Setup guides and explanations

/infrastructure
  - Cloud formation templates
```

### 4. Test the OAuth Flow

Visit `http://localhost:3000` in your browser and follow these steps:

1. Click the "Log in" button
2. You'll be redirected to the Cognito hosted UI for authentication
3. Create an account or log in with existing credentials
4. After successful authentication, you'll be redirected back to the client app
5. Click "Fetch MCP Data" to make an authenticated request to the MCP server

## Architecture Overview
- Detailed [Architecture Overview](./architecture-guide.md)

### Components

1. **MCP Client**: A Node.js Express application that:
   - Discovers the authorization server using the Protected Resource Metadata
   - Implements OAuth 2.1 authorization code flow with PKCE
   - Makes authenticated requests to the MCP server

2. **MCP Server**: Implemented as AWS API Gateway + Lambda that:
   - Serves the Protected Resource Metadata document
   - Validates access tokens from Cognito
   - Provides protected API endpoints for MCP operations

3. **AWS Cognito**: Acts as the OAuth 2.1 Authorization Server:
   - Handles user authentication
   - Issues access and refresh tokens
   - Provides authorization server metadata

### Authorization Flow

The flow follows the sequence described in the MCP Authorization specification:

1. Client makes a request to MCP server without a token
2. Server responds with 401 + WWW-Authenticate header pointing to resource metadata
3. Client fetches resource metadata to discover the authorization server
4. Client redirects user to authorization server (Cognito) for authentication
5. User authenticates with Cognito and is redirected back with an authorization code
6. Client exchanges code for tokens using PKCE flow
7. Client makes authenticated requests to MCP server using access token
8. Server validates token and allows access to protected resources

## Project Structure

```
mcp-oauth2-aws-cognito/
├── infrastructure/            # AWS infrastructure code
│   └── cloudformation/        # CloudFormation templates
├── scripts/                   # Deployment scripts
├── src/
│   ├── mcp-server/            # MCP server implementation
│   ├── client/                # MCP client implementation
│   └── shared/                # Shared utilities
└── docs/                      # Documentation
```

## Cleanup

To delete all AWS resources created for this demo:

```bash
npm run cleanup
```

This will remove:
- Cognito User Pool and app client
- Associated IAM roles and policies

## Troubleshooting

### Common Issues

1. MCP + OAuth 2.1. **401 Unauthorized but no WWW-Authenticate header**
   - Check that your MCP server implementation is correctly setting the WWW-Authenticate header
   - Verify the format follows RFC9728 requirements

2. **Token validation failures**
   - Ensure the Cognito client app is configured with the correct callback URL
   - Check that PKCE is properly implemented on the client side
   - Verify the scopes requested match what's configured in Cognito

3. **CORS issues**
   - If experiencing CORS errors, check the API Gateway CORS configuration
   - Ensure OPTIONS requests are properly handled

4. **CloudFormation deployment failures**
   - Check that your AWS CLI has sufficient permissions
   - Look at CloudFormation events for detailed error messages


## Advanced Configuration

### Custom Domain

To use a custom domain instead of the default Cognito and API Gateway URLs:

1. Register a domain in AWS Route 53 or your preferred domain registrar
2. Create an ACM certificate for your domain
3. Configure a custom domain for Cognito User Pool
4. Set up a custom domain for API Gateway

### Cognito User Pool Configuration

For additional security or customization:

1. Enable MFA for stronger authentication
2. Customize the Cognito hosted UI with your branding
3. Add additional identity providers (Google, Facebook, etc.)
4. Configure custom email or SMS messages

### Testing with Multiple Authorization Servers

The MCP specification supports multiple authorization servers. To test this:

1. Set up another OAuth provider (Auth0, Okta, etc.)
2. Add it to the `authorization_servers` array in your Protected Resource Metadata
3. Update your client to handle selection between multiple authorization servers
