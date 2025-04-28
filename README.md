# MCP + OAuth2.1 + AWS Cognito Example

## Overview

This repository demonstrates how to secure a Model Context Protocol (MCP) server using OAuth 2.1 authorization flows with AWS Cognito, implemented entirely with Node.js and Express.js.

Based on the new MCP Authorization Specification published in April 2025, this project showcases:
- MCP server acting as a **Resource Server** (RS)
- AWS Cognito acting as an **Authorization Server** (AS)
- OAuth 2.1 Authorization Code Flow with PKCE
- Protected Resource Metadata (PRM) document discovery
- Dynamic discovery of Authorization Server metadata


## Understanding the New MCP Authorization Spec

The new MCP Authorization Specification introduces a clean separation between Resource Servers and Authorization Servers, making it easier to integrate with existing identity providers like AWS Cognito, Okta, Auth0, and others.

Key components of the specification:

1. **Protected Resource Metadata (PRM)** document
   - The MCP server serves this document at `/.well-known/oauth-protected-resource`
   - Contains information about authorization servers, supported scopes, etc.
   - Follows RFC9728 (OAuth 2.0 Protected Resource Metadata)

2. **Discovery Process**
   - When a client receives a 401 Unauthorized response, the WWW-Authenticate header contains a pointer to the PRM document
   - Client fetches the PRM document to discover the authorization server
   - Client then fetches the authorization server metadata to discover the endpoints

3. **OAuth 2.1 Authorization**
   - Authorization Code flow with PKCE
   - Bearer token usage for authenticated requests
   - Token validation on the server side

This implementation showcases how to apply these concepts with AWS Cognito.

## Architecture
```
Client → MCP Server → AWS Cognito
        (Resource Server)    (Authorization Server)
```
1. Client sends a request without a token.
2. MCP server responds with 401 Unauthorized + WWW-Authenticate header pointing to PRM metadata.
3. Client retrieves PRM, discovers the Authorization Server URL.
4. Client performs OAuth 2.1 Authorization Code flow (with PKCE) against AWS Cognito.
5. Client obtains an access token and retries request to MCP server.
6. MCP server validates token and grants access to the protected resource.

Diagrams:
- [Architecture Diagram](./docs/mcp-oauth-architecture.mermaid)
- [Sequence Diagram](./docs/mcp-oauth-sequence.mermaid)

## Quick Start

### Prerequisites
- Node.js installed
- AWS account with Cognito setup
- Basic knowledge of OAuth 2.1 flows

### Setup
1. Clone the repository
   ```bash
   git clone https://github.com/empires-security/mcp-oauth2-aws-cognito.git
   cd mcp-oauth2-aws-cognito
   ```

2. Install dependencies for all
   ```bash
   npm run install:all
   ```

3. Deploy AWS resources
   ```bash
   npm run deploy:cognito
   ```

4. Review generated `.env` files in:
   - `src/client/.env`
   - `src/mcp-server/.env`
   - Compare with `.env.example` files
   - Manually verify/update CLIENT_SECRET if needed

### Running the Application
1. Start both the client and server
   ```bash
   npm run dev
   ```
2. Visit http://localhost:3000 to test the OAuth flow

3. Sign Up for a New User
   - Click the "Log in" button
   - Select "Sign up" in the Cognito hosted UI
   - Create a new user account
   - Verify your account by entering the confirmation code sent to your email
   - After successful verification, you'll be redirected back to the application
   - Click the "Fetch MCP Data" button to make an authenticated request to the MCP server

### Cleanup
1. Cleanup AWS resources
   ```bash
   npm run cleanup
   ```

For detailed setup instructions, see the [Setup Guide](./docs/setup-guide.md).

## Documentation

- [Setup Guide](./docs/setup-guide.md)
- [Architecture Overview](./docs/architecture-guide.md)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## References

- [Model Context Protocol Official Specification](https://modelcontextprotocol.io/specification/draft/basic/authorization)
- [OAuth 2.1 Draft](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-12)
- [OAuth 2.0 Protected Resource Metadata](https://datatracker.ietf.org/doc/rfc9728/)
- [AWS Cognito Developer Guide](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Authors

- **Empires Security Labs** 🚀

