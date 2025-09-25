# CORS Proxy

A simple CORS proxy server to bypass browser CORS restrictions.

## Introduction

CORS Proxy is a lightweight proxy server that helps developers solve cross-origin resource sharing (CORS) restriction issues. When you try to access APIs from different domains in your frontend application, the browser's security policy will block these requests. By using this proxy server, you can easily bypass these restrictions.

## Features

- Bypass browser CORS restrictions
- Support all HTTP methods (GET, POST, PUT, DELETE, etc.)
- Support HTTPS target sites
- Simple and easy-to-use API
- Provide client-side fetch wrapper

## Installation

Make sure Node.js (version 14 or higher) is installed on your system.

```bash
# Clone the project
git clone <repository-url>
cd cors-proxy

# Install dependencies
npm install
```

## Usage

### Starting the Server

```bash
# Use default port 3000 and path "/"
npm start

# Or specify port and path
node index.js --port=30110 --path=/cors-proxy
```

### Sending Requests Through the Proxy

#### 1. Using URL Directly

After starting the server, you can access the target URL in the following way:

```
http://localhost:30110/cors-proxy?url=https://api.example.com/data
```

#### 2. Using the Provided Fetch Wrapper

The project provides a fetch wrapper for more convenient request sending:

```javascript
import { fetch, config } from "./src/fetch.js";

// Configure the proxy server
config.port = 30110;
config.path = "/cors-proxy";

// Send request
const response = await fetch("https://api.example.com/data");
const data = await response.json();
```

### Client Example

See the `demo.html` file for a complete usage example.

## API Documentation

### Server Endpoints

- **GET/POST/PUT/DELETE** `/[path]?url=[targetUrl]`
  - `path`: Configured server path prefix
  - `url`: Target URL to proxy (needs to be URL encoded)

### Response

The proxy server will return the response from the target URL with appropriate CORS headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

## Configuration Options

### Command Line Arguments

- `-p, --port`: Server port (default: 3000 or environment variable PORT)
- `-P, --path`: Server path prefix (default: "/")

### Environment Variables

- `PORT`: Server port (default: 3000)

## Development

### Project Structure

```
cors-proxy/
├── index.js          # Server entry point
├── demo.html         # Usage example
├── package.json      # Project configuration
├── src/
│   ├── server.js     # Server core logic
│   └── fetch.js      # Client fetch wrapper
└── README.md         # Project documentation
```

### Server Core Logic

The server processes requests through the following steps:

1. Verify that the request path matches the configured path prefix
2. Add CORS headers to the response
3. Handle OPTIONS preflight requests
4. Parse the target URL
5. Make a request to the target server
6. Forward the response to the client

## License

This project is licensed under the Apache-2.0 License. See the [LICENSE](LICENSE) file for details.