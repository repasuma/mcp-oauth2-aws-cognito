# MCP OAuth 2.1 AWS Cognito - Architecture Overview

This document explains the architecture of the MCP OAuth 2.1 implementation with AWS Cognito as the Authorization Server.

## System Architecture

The implementation is based on a clean separation between the MCP server (Resource Server) and AWS Cognito (Authorization Server) as defined in the latest MCP Authorization specification.

## Components

### 1. MCP Client (Express.js)

A Node.js Express application that implements:
- Discovery of the Authorization Server through Protected Resource Metadata
- OAuth 2.1 Authorization Code flow with PKCE
- Token management (storage, refresh, etc.)
- Authenticated API calls to the MCP server

The client follows this process:
1. Makes initial request to the MCP server
2. Receives 401 with WWW-Authenticate header pointing to resource metadata
3. Fetches resource metadata to discover authorization server
4. Initiates OAuth flow with Cognito (with PKCE for security)
5. Receives and stores tokens
6. Uses access token for authenticated requests

### 2. MCP Server (Resource Server, Express.js)

Implemented using Express.js:
- Serves the Protected Resource Metadata document at `/.well-known/oauth-protected-resource`
- Validates access tokens from Cognito
- Returns 401 with appropriate WWW-Authenticate header for unauthenticated requests
- Provides MCP API endpoints as protected resources

### 3. AWS Cognito (Authorization Server)

Serves as the OAuth 2.1 Authorization Server:
- Manages user authentication and authorization
- Issues access tokens and refresh tokens
- Provides JWT tokens with proper claims
- Supports authorization code flow with PKCE

## Authentication Flow

The complete OAuth 2.1 flow in this implementation works as follows:

1. **Initial Request & Discovery**
   - Client makes a request to the MCP server without authentication
   - Server responds with 401 and WWW-Authenticate header
   - Client extracts the resource metadata URL from the header
   - Client fetches the Protected Resource Metadata document
   - Client discovers the authorization server URL from the metadata

2. **Authorization**
   - Client generates PKCE code verifier and challenge
   - Client redirects user to Cognito authorization endpoint
   - User authenticates with Cognito
   - Cognito redirects back to client with authorization code

3. **Token Exchange**
   - Client exchanges authorization code + code verifier for tokens
   - Cognito issues access token, ID token, and refresh token
   - Client stores tokens securely

4. **Authenticated Requests**
   - Client includes access token in Authorization header
   - MCP server validates the token with Cognito
   - If valid, server processes the request and returns protected resources
   - If invalid, server returns 401 with WWW-Authenticate header

5. **Token Refresh**
   - When access token expires, client uses refresh token
   - Client requests new access token from Cognito
   - Client updates stored tokens

## AWS Resource Configuration

### Cognito User Pool
- User management and authentication
- OAuth app client with authorization code grant
- Domain for hosted UI

### Express.js Server Configuration
- Implements OAuth 2.1 discovery mechanisms
- Serves Protected Resource Metadata
- Validates tokens using Cognito JWT verification

## Security Considerations

This implementation follows OAuth 2.1 and MCP security best practices:

1. **PKCE (Proof Key for Code Exchange)**
   - Protects against authorization code interception
   - Required for all authorization code flows

2. **Token Validation**
   - JWT signature verification
   - Audience and issuer validation
   - Expiration checking

3. **HTTPS Only**
   - All endpoints use HTTPS
   - Secure token transmission

4. **Short-lived Tokens**
   - Access tokens have limited lifetime
   - Refresh tokens for obtaining new access tokens

5. **Proper Authorization**
   - Bearer token usage according to RFC6750
   - WWW-Authenticate headers following RFC9728
   
## Diagrams
- [Architecture Diagram](./mcp-oauth-architecture.mermaid)
- [Sequence Diagram](./mcp-oauth-sequence.mermaid)
