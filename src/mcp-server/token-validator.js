const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const axios = require('axios');
const config = require('../shared/config');

// Cache for JWKs
let jwksCache = null;
let jwksCacheTime = null;
const JWKS_CACHE_DURATION = 3600000; // 1 hour in milliseconds

async function getJwks() {
  // Check if we have a cached, non-expired JWKs
  const now = Date.now();
  if (jwksCache && jwksCacheTime && (now - jwksCacheTime < JWKS_CACHE_DURATION)) {
    return jwksCache;
  }
  
  // Fetch JWKs from Cognito
  const jwksUrl = `${config.cognito.issuer}/.well-known/jwks.json`;
  
  try {
    const response = await axios.get(jwksUrl);
    jwksCache = response.data;
    jwksCacheTime = now;
    return jwksCache;
  } catch (error) {
    console.error('Error fetching JWKs:', error);
    throw new Error('Unable to fetch JWKs');
  }
}

async function validateToken(token) {
  try {
    // Decode the token without verification to get the kid (key ID)
    const decodedToken = jwt.decode(token, { complete: true });
    
    if (!decodedToken) {
      throw new Error('Invalid token format');
    }
    
    console.log('Decoded Token Payload:', decodedToken.payload);
    console.log('Configured Issuer:', config.cognito.issuer);
    console.log('Configured Client ID:', config.cognito.clientId);

    const { kid } = decodedToken.header;
    
    // Get the JWKs
    const jwks = await getJwks();
    
    // Find the key that matches the kid
    const key = jwks.keys.find(k => k.kid === kid);
    
    if (!key) {
      throw new Error('Invalid token - key not found');
    }
    
    // Convert JWK to PEM
    const pem = jwkToPem(key);
    
    // Verify the token
    const verifiedToken = jwt.verify(token, pem, {
      issuer: config.cognito.issuer,
      clientId: config.cognito.clientId
    });
    
    return verifiedToken;
  } catch (error) {
    console.error('Token validation error:', error.message);
    throw new Error('Token validation failed: ' + error.message);
  }
}

module.exports = {
  validateToken
};