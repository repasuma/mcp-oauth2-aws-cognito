# MCP + OAuth2.1 + AWS Cognito Example

## Overview

This repository demonstrates how to secure a Model Context Protocol (MCP) server using OAuth 2.1 authorization flows with AWS Cognito as the Authorization Server.

It showcases:
- MCP server acting as a **Resource Server** (RS).
- AWS Cognito acting as an **Authorization Server** (AS).
- OAuth 2.1 Authorization Code Flow with PKCE.
- Protected Resource Metadata (PRM) document discovery.
- Dynamic discovery of Authorization Server metadata.

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

## Requirements

- Node.js or C# (.NET 8) (depending on server/client implementation)
- AWS account with Cognito setup
- Basic knowledge of OAuth 2.1 flows

## Coming Soon

- Dynamic Client Registration (DCR) example (if supported).
- Terraform IaC templates for AWS setup.
- Multi-provider example (Okta, Auth0).

## Setup Instructions

### 1. AWS Cognito Setup

- Create a new **Cognito User Pool**.
- Create an **App Client** with:
  - OAuth 2.0 Authorization Code grant flow enabled
  - PKCE enabled
  - Callback URL (e.g., `http://localhost:3000/callback` for local testing)
- Enable **OpenID Connect** scopes like `openid`, `profile`, `email`.

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

## Authors

- **Empires Security Labs** 🚀

## References

- [Model Context Protocol Official Specification](https://modelcontextprotocol.io/specification/draft/basic/authorization)
- [OAuth 2.1 Draft](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-12)
- [AWS Cognito Developer Guide](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)


## License

This project is licensed under the MIT License.
