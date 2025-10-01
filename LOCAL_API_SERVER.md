# Local Graph API Server

This document contains the complete API server code that can be used as a replacement for the `api.keypo.io` endpoints in the list command. This server provides a REST wrapper around The Graph Protocol's GraphQL API for querying blockchain-indexed file metadata.

## Prerequisites

- Node.js 18+
- npm or yarn
- Access to The Graph Protocol (you'll need a Graph URL and API key)
- RPC endpoint for on-chain calls (for the filesByMinter endpoint)

## Installation

1. Create a new directory for your API server:
```bash
mkdir keypo-api-local
cd keypo-api-local
```

2. Initialize a new Node.js project:
```bash
npm init -y
```

3. Install required dependencies:
```bash
npm install express dotenv graphql-request graphql ethers cors
npm install -D @types/node @types/express typescript ts-node nodemon
```

4. Create a TypeScript configuration file (`tsconfig.json`):
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

5. Update `package.json` scripts:
```json
{
  "scripts": {
    "dev": "nodemon src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

## Server Code

### 1. Create the main server file (`src/server.ts`):

```typescript
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { graphRouter } from "./graphRouter";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/graph", graphRouter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "local-graph-api" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Graph endpoints available at http://localhost:${PORT}/graph`);
});
```

### 2. Create the Graph router (`src/graphRouter.ts`):

```typescript
import express from "express";
import dotenv from "dotenv";
import { gql, request } from 'graphql-request'
import { ethers } from "ethers";

dotenv.config();

const GRAPH_URL = process.env.GRAPH_URL;
const GRAPH_KEY = process.env.GRAPH_KEY;

const graphRouter = express.Router();

if (!GRAPH_URL || !GRAPH_KEY) {
  throw new Error(
    "Graph API URL or API key is missing in environment variables."
  );
}

const headers = {
    Authorization: `Bearer ${GRAPH_KEY}`,
};

graphRouter.get("/filesByOwner", async (req, res) => {
  try {
    const fileOwnerAddress = req.query.fileOwnerAddress;
    const skip = parseInt(req.query.skip as string) || 0;
    const first = parseInt(req.query.first as string) || 25;

    // Validate pagination parameters
    if (skip < 0 || first < 1 || first > 100) {
      res.status(400).json({ error: "Invalid pagination parameters" });
      return;
    }

    const ownerWhereClause = fileOwnerAddress
        ? `(first: ${first}, skip: ${skip}, where: { fileOwner: "${fileOwnerAddress}" }, orderBy: id, orderDirection: asc)`
        : `(first: ${first}, skip: ${skip}, orderBy: id, orderDirection: asc)`;
    const deletionWhereClause = fileOwnerAddress
        ? `(first: ${first}, skip: ${skip}, where: { fileOwner: "${fileOwnerAddress}" }, orderBy: id, orderDirection: asc)`
        : `(first: ${first}, skip: ${skip}, orderBy: id, orderDirection: asc)`;

    const query = gql`{
        permissionedFileDeployeds${ownerWhereClause} {
          id
          fileIdentifier
          fileOwner
          fileMetadata
          fileContractAddress
        }
        permissionedFileDeleteds${deletionWhereClause} {
          fileIdentifier
          fileOwner
          fileContractAddress
        }
      }`;

    const response = await request<{
        permissionedFileDeployeds: any[];
        permissionedFileDeleteds: any[];
      }>(GRAPH_URL, query, {}, headers);
   
    const { permissionedFileDeployeds = [], permissionedFileDeleteds = [] } = response;

    res.status(200).json({ permissionedFileDeployeds, permissionedFileDeleteds });
  } catch (error) {
    console.error("GraphQL query error:", error);
    
    if (error instanceof Error) {
      if (error.message.includes('network')) {
        res.status(503).json({ error: "Graph service unavailable" });
        return;
      }
      if (error.message.includes('authentication')) {
        res.status(401).json({ error: "Graph authentication failed" });
        return;
      }
    }
    
    res.status(500).json({ error: "Failed to execute GraphQL query" });
  }
});

graphRouter.get("/filesByAdmin", async (req, res) => {
  const fileOwnerAddress = req.query.fileOwnerAddress;
  const skip = parseInt(req.query.skip as string) || 0;
  const first = parseInt(req.query.first as string) || 25;

  const ownerWhereClause = `(first: ${first}, skip: ${skip}, where: { fileOwner: "${fileOwnerAddress}" }, orderBy: id, orderDirection: asc)`;      

  const query = gql`{
      permissionedFileDeployeds${ownerWhereClause} {
        id
        fileIdentifier
        fileOwner
        fileMetadata
        fileContractAddress
      }
    }`;

  try {

    const response = await request<{
        permissionedFileDeployeds: any[];        
      }>(GRAPH_URL, query, {}, headers);
   
    const { permissionedFileDeployeds = [] } = response;


    res.status(200).json({ permissionedFileDeployeds });
  } catch (error) {
    console.error("GraphQL query error:", error);
    res.status(500).json({ error: "Failed to execute GraphQL query" });
  }
});

graphRouter.get("/filesByMinter", async (req, res) => {
  try {
    const fileMinterAddress = req.query.fileMinterAddress;
    const skip = parseInt(req.query.skip as string) || 0;
    const first = parseInt(req.query.first as string) || 25;
    
    // Validate required parameter
    if (!fileMinterAddress) {
      res.status(400).json({ error: "Missing required parameter: fileMinterAddress" });
      return;
    }

    // Validate pagination parameters
    if (skip < 0 || first < 1 || first > 100) {
      res.status(400).json({ error: "Invalid pagination parameters" });
      return;
    }

    // Validate address format (basic check)
    if (typeof fileMinterAddress !== 'string' || fileMinterAddress === 'undefined' || fileMinterAddress.length < 10) {
      res.status(400).json({ error: "Invalid fileMinterAddress format" });
      return;
    }
    
    const ownerWhereClause = `(first: ${first}, skip: ${skip}, where: { fileAccessMinter: "${fileMinterAddress}" }, orderBy: id, orderDirection: asc)`;  

    const query = gql`{
      permissionedFileAccessMinteds${ownerWhereClause} {
        id
        fileIdentifier
        fileAccessMinter
        fileContractAddress
        fileMetadata
      }
    }`

    const response = await request<{
      permissionedFileAccessMinteds: any[];
    }>(GRAPH_URL, query, {}, headers);

    const { permissionedFileAccessMinteds = [] } = response;

    // Create ethers provider
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);

    // Add owner to each file
    const filesWithOwners = await Promise.all(
      permissionedFileAccessMinteds.map(async (file) => {
        try {
          // Create contract instance with owner() function
          const contract = new ethers.Contract(
            file.fileContractAddress,
            [
              {
                "inputs": [],
                "name": "owner",
                "outputs": [{"internalType": "address", "name": "", "type": "address"}],
                "stateMutability": "view",
                "type": "function"
              }
            ],
            provider
          );
          
          // Get owner address
          const owner = await contract.owner();
          
          return {
            ...file,
            fileOwner: owner
          };
        } catch (error) {
          console.error(`Error getting owner for contract ${file.fileContractAddress}:`, error);
          return {
            ...file,
            fileOwner: null
          };
        }
      })
    );

    res.status(200).json({ permissionedFileAccessMinteds: filesWithOwners });
  } catch (error) {
    console.error("GraphQL query error:", error);
    
    if (error instanceof Error) {
      if (error.message.includes('Failed to decode')) {
        res.status(400).json({ error: "Invalid address format in query parameters" });
        return;
      }
      if (error.message.includes('network')) {
        res.status(503).json({ error: "Graph service unavailable" });
        return;
      }
      if (error.message.includes('authentication')) {
        res.status(401).json({ error: "Graph authentication failed" });
        return;
      }
    }
    
    res.status(500).json({ error: "Failed to execute GraphQL query" });
  }  
});

graphRouter.get("/mintersByFile", async (req, res) => {
  const fileContractAddress = req.query.fileContractAddress;
  const skip = parseInt(req.query.skip as string) || 0;
  const first = parseInt(req.query.first as string) || 25;

  const query = gql`{
    permissionedFileAccessMinteds(first: ${first}, skip: ${skip}, where: { fileContractAddress: "${fileContractAddress}" }, orderBy: id, orderDirection: asc) {
      id
      fileAccessMinter
      fileMetadata
    }
  }`;

  try {
    const response = await request<{
      permissionedFileAccessMinteds: any[];
    }>(GRAPH_URL, query, {}, headers);

    const { permissionedFileAccessMinteds = [] } = response;

    res.status(200).json({ permissionedFileAccessMinteds });
  } catch (error) {
    console.error("GraphQL query error:", error);
    res.status(500).json({ error: "Failed to execute GraphQL query" });
  }
});

graphRouter.get("/deletedFiles", async (req, res) => {
  const addresses = req.query.addresses;

  const query = gql`{
    permissionedFileDeleteds(where: { fileContractAddress_in: ${addresses} }) {
      id
      fileIdentifier
      fileOwner
      fileContractAddress
    }
  }`

  try {
    const response = await request<{
      permissionedFileDeleteds: any[];
    }>(GRAPH_URL, query, {}, headers);

    const { permissionedFileDeleteds = [] } = response;

    res.status(200).json({ permissionedFileDeleteds });
  } catch (error) {
    console.error("GraphQL query error:", error);
    res.status(500).json({ error: "Failed to execute GraphQL query" });
  }
});

graphRouter.get("/fileMetadata", async (req, res) => {
  const fileIdentifier = req.query.fileIdentifier;
  const query = gql`{
    permissionedFileDeployeds(where: { fileIdentifier: "${fileIdentifier}" }) {
      id
      fileIdentifier
      fileOwner
      fileMetadata
      fileContractAddress
    }
  }`;
  try {
    const response = await request<{
      permissionedFileDeployeds: any[];
    }>(GRAPH_URL, query, {}, headers);

    const { permissionedFileDeployeds = [] } = response;

    res.status(200).json({ fileMetadata: permissionedFileDeployeds[0] });
  } catch (error) {
    console.error("GraphQL query error:", error);
    res.status(500).json({ error: "Failed to execute GraphQL query" });
  }
});

// Add retry logic helper function
async function requestWithRetry(url: string, query: any, variables: any = {}, headers: any = {}, maxRetries: number = 3): Promise<any> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await request(url, query, variables, headers);
    } catch (error: any) {
      if (error.response?.status === 429) {
        const retryAfter = parseInt(error.response.headers.get('retry-after') || '1');
        const delay = Math.min(retryAfter * 1000 * Math.pow(2, attempt), 30000); // Cap at 30s
        
        console.log(`Rate limited, retrying after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error; // Re-throw non-429 errors
    }
  }
  throw new Error('Max retries exceeded');
}

// Modified isDeleted endpoint
graphRouter.get("/isDeleted", async (req, res) => {
  try {
    const fileIdentifier = req.query.fileIdentifier;
    const fileIdentifiers = req.query.fileIdentifiers;

    // Handle batch request (multiple identifiers)
    if (fileIdentifiers) {
      let identifierArray: string[];
      
      // Parse identifiers - could be JSON array or comma-separated string
      if (typeof fileIdentifiers === 'string') {
        try {
          identifierArray = JSON.parse(fileIdentifiers);
        } catch {
          // If JSON parse fails, try comma-separated
          identifierArray = fileIdentifiers.split(',').map(id => id.trim());
        }
      } else if (Array.isArray(fileIdentifiers)) {
        identifierArray = fileIdentifiers as string[];
      } else {
        res.status(400).json({ error: "Invalid fileIdentifiers format" });
        return;
      }

      // Validate array
      if (!Array.isArray(identifierArray) || identifierArray.length === 0) {
        res.status(400).json({ error: "fileIdentifiers must be a non-empty array" });
        return;
      }

      // Limit batch size to prevent overly large queries
      if (identifierArray.length > 100) {
        res.status(400).json({ error: "Maximum 100 identifiers per batch request" });
        return;
      }

      // Build batch query
      const query = gql`{
        permissionedFileDeleteds(where: { fileIdentifier_in: ${JSON.stringify(identifierArray)} }) {
          fileIdentifier
        }
      }`;

      const response = await requestWithRetry(GRAPH_URL, query, {}, headers);
      const deletedIdentifiers = response.permissionedFileDeleteds.map((item: any) => item.fileIdentifier);

      // Return object mapping each identifier to its deletion status
      const result: Record<string, boolean> = {};
      identifierArray.forEach(id => {
        result[id] = deletedIdentifiers.includes(id);
      });

      res.status(200).json({ deletedFiles: result });
      return;
    }

    // Handle single request (existing logic with retry)
    if (!fileIdentifier) {
      res.status(400).json({ error: "Missing required parameter: fileIdentifier or fileIdentifiers" });
      return;
    }

    const query = gql`{
      permissionedFileDeleteds(where: { fileIdentifier: "${fileIdentifier}" }) {
        id
        fileIdentifier
        fileOwner
        fileContractAddress
      }
    }`;

    const response = await requestWithRetry(GRAPH_URL, query, {}, headers);
    const { permissionedFileDeleteds = [] } = response;

    res.status(200).json({ isDeleted: permissionedFileDeleteds.length > 0 });
  } catch (error) {
    console.error("GraphQL query error:", error);
    
    if (error instanceof Error) {
      if (error.message.includes('network')) {
        res.status(503).json({ error: "Graph service unavailable" });
        return;
      }
      if (error.message.includes('authentication')) {
        res.status(401).json({ error: "Graph authentication failed" });
        return;
      }
      if (error.message.includes('Max retries exceeded')) {
        res.status(429).json({ error: "Rate limit exceeded, please try again later" });
        return;
      }
    }
    
    res.status(500).json({ error: "Failed to execute GraphQL query" });
  }
});

export { graphRouter };
```

## Configuration

Create a `.env` file in your API server directory:

```env
# The Graph Protocol Configuration
GRAPH_URL=YOUR_GRAPH_SUBGRAPH_URL_HERE
GRAPH_KEY=YOUR_GRAPH_API_KEY_HERE

# RPC Configuration (for on-chain calls in filesByMinter)
RPC_URL=https://rpc.ankr.com/eth  # Or your preferred RPC endpoint

# Server Configuration
PORT=3000
```

### Getting Graph Credentials

1. **The Graph Hosted Service** (if still available):
   - Visit https://thegraph.com/hosted-service/
   - Create an account and deploy your subgraph
   - Get your API URL and key from the dashboard

2. **The Graph Network**:
   - Visit https://thegraph.com/studio/
   - Create a subgraph on the decentralized network
   - Generate an API key from your dashboard

3. **Self-hosted Graph Node**:
   - Follow instructions at https://github.com/graphprotocol/graph-node
   - Your `GRAPH_URL` will be your local node endpoint
   - `GRAPH_KEY` may not be required for self-hosted

## Running the Server

### Development Mode (with hot reload):
```bash
npm run dev
```

### Production Mode:
```bash
npm run build
npm start
```

The server will be available at `http://localhost:3000`

## Testing the API

Test that your server is running correctly:

```bash
# Health check
curl http://localhost:3000/health

# Test filesByOwner endpoint
curl "http://localhost:3000/graph/filesByOwner?fileOwnerAddress=0xYOUR_ADDRESS&skip=0&first=10"

# Test filesByMinter endpoint
curl "http://localhost:3000/graph/filesByMinter?fileMinterAddress=0xYOUR_ADDRESS&skip=0&first=10"

# Test isDeleted endpoint (single)
curl "http://localhost:3000/graph/isDeleted?fileIdentifier=YOUR_FILE_ID"

# Test isDeleted endpoint (batch)
curl "http://localhost:3000/graph/isDeleted?fileIdentifiers=[\"id1\",\"id2\",\"id3\"]"
```

## Modifying synapse-cli to Use Local API

To use your local API server instead of `api.keypo.io`, you have two options:

### Option 1: Environment Variable (Recommended)

1. Add to your synapse-cli `.env` file:
```env
# Add this line to use local API
LIST_API_URL=http://localhost:3000
```

2. Update `src/utils/list.ts` to read from environment:
```typescript
// At the top of the file, after imports
const DEFAULT_API_URL = process.env.LIST_API_URL || 'https://api.keypo.io';

// In the list function, change line 22:
const baseUrl = apiUrl || DEFAULT_API_URL;
```

### Option 2: Command Line Flag

The list command already supports a custom API URL through the `--api-url` flag:

```bash
# Using the list command with local API
npm run list -- --api-url http://localhost:3000

# Or for list-encrypted
npm run list-encrypted -- --api-url http://localhost:3000
```

### Option 3: Permanent Code Change

If you want to permanently use the local API, modify `src/utils/list.ts` line 22:

```typescript
// Change from:
const baseUrl = apiUrl || 'https://api.keypo.io';

// To:
const baseUrl = apiUrl || 'http://localhost:3000';
```

## API Endpoints Reference

| Endpoint | Method | Query Parameters | Description |
|----------|--------|------------------|-------------|
| `/graph/filesByOwner` | GET | `fileOwnerAddress`, `skip`, `first` | Get files owned by an address |
| `/graph/filesByMinter` | GET | `fileMinterAddress`, `skip`, `first` | Get files where address minted access |
| `/graph/filesByAdmin` | GET | `fileOwnerAddress`, `skip`, `first` | Get files for admin view |
| `/graph/mintersByFile` | GET | `fileContractAddress`, `skip`, `first` | Get minters for a specific file |
| `/graph/deletedFiles` | GET | `addresses` | Get deleted files for contract addresses |
| `/graph/fileMetadata` | GET | `fileIdentifier` | Get metadata for a specific file |
| `/graph/isDeleted` | GET | `fileIdentifier` or `fileIdentifiers` | Check if file(s) are deleted |

## Troubleshooting

### Common Issues

1. **"Graph API URL or API key is missing"**
   - Ensure your `.env` file contains both `GRAPH_URL` and `GRAPH_KEY`
   - Restart the server after updating `.env`

2. **"Graph service unavailable" errors**
   - Check your internet connection
   - Verify your Graph URL is correct
   - Ensure your Graph API key is valid and has not expired

3. **Rate limiting (429 errors)**
   - The server includes retry logic with exponential backoff
   - Consider implementing caching for frequently accessed data
   - Upgrade your Graph Protocol plan if hitting limits frequently

4. **RPC errors in filesByMinter**
   - Verify your `RPC_URL` is correct and accessible
   - Ensure the RPC endpoint supports the network your contracts are on
   - Check that the RPC provider is not rate limiting you

## Docker Deployment (Optional)

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t keypo-api-local .
docker run -p 3000:3000 --env-file .env keypo-api-local
```

## Security Considerations

1. **API Keys**: Never commit your `.env` file to version control
2. **CORS**: Configure CORS appropriately for production
3. **Rate Limiting**: Consider adding rate limiting middleware for production
4. **Input Validation**: The code includes basic validation but consider adding more comprehensive checks
5. **HTTPS**: Use a reverse proxy like nginx with SSL certificates in production

## Additional Features to Consider

1. **Caching**: Add Redis caching to reduce Graph API calls
2. **Monitoring**: Add logging and monitoring (e.g., with Winston and Prometheus)
3. **Authentication**: Add API key authentication for your endpoints
4. **Load Balancing**: Use PM2 or similar for process management
5. **Database**: Consider adding a database to cache frequently accessed data