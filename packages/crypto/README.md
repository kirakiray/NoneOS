# Base Package

This package contains cryptographic utility functions for the NoneOS project.

## Files

### crypto-rsa.js
Contains RSA encryption related functions:
- `generateRSAKeyPair()` - Generates an RSA key pair
- `encryptMessage()` - Encrypts a message using a public key
- `decryptMessage()` - Decrypts a message using a private key

### crypto-ecdsa.js
Contains ECDSA signature related functions:
- `generateKeyPair()` - Generates an ECDSA key pair
- `importPrivateKey()` - Imports a private key
- `importPublicKey()` - Imports a public key
- `createSigner()` - Creates a signing function
- `createVerifier()` - Creates a verification function

### crypto-verify.js
Contains data verification functions:
- `verifyData()` - Verifies data signatures

### verify.js
Legacy file maintaining backward compatibility with updated imports.