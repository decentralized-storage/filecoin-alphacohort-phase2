# Synapse CLI

A TypeScript Node.js command-line interface for uploading, viewing, and downloading files from Filecoin using the Synapse SDK.

## Features

- 📤 **Upload** files to Filecoin via Synapse (encrypted with public access by default)
- 📋 **List** encrypted files from your wallet
- 🌍 **List Public** files from all users that anyone can decrypt
- 📥 **Download** files using their Piece CID with automatic decryption
- 🤝 **Share** encrypted files by granting access to other wallets
- 🗑️ **Delete** files and revoke access permissions
- 🔒 **Make Private/Public** toggle file access permissions
- 💰 **Check balances** (FIL and USDFC)
- 💳 **Deposit** USDFC and manage storage allowances
- 🔐 **End-to-End Encryption** with Lit Protocol v8 (default for all uploads)
- 🔥 Built with TypeScript for type safety

## Prerequisites

- Node.js 18+ and npm
- TypeScript knowledge (optional for usage, required for development)
- A private key for a wallet with:
  - Some FIL tokens for gas fees
  - USDFC tokens for storage payments

### Getting Test Tokens (Calibration Testnet)

- **FIL tokens**: [Calibration Faucet](https://faucet.calibnet.chainsafe-fil.io/funds.html)
- **USDFC tokens**: [USDFC Faucet](https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc)

## Installation

1. Clone or create this project

2. Install dependencies:
```bash
npm install
```

3. Build the TypeScript project:
```bash
npm run build
```

4. Create a `.env` file from the example:
```bash
cp .env.example .env
```

5. Edit `.env` and add your configuration:
```env
# Ethereum private key (without 0x prefix)
PRIVATE_KEY=your_private_key_here_without_0x_prefix

# Network configuration (mainnet or calibration)
NETWORK=calibration

# Storage configuration
STORAGE_CAPACITY_GB=10
PERSISTENCE_PERIOD_DAYS=30
WITH_CDN=true

# Lit Protocol encryption configuration (required for --encrypt option)
# Registry contract address for smart contract-based access control
REGISTRY_CONTRACT_ADDRESS=0x8370eE1a51B5F31cc10E2f4d786Ff20198B10BBE

# Validation contract address for permission checking
VALIDATION_CONTRACT_ADDRESS=0x35ADB6b999AbcD5C9CdF2262c7190C7b96ABcE4C

# ZeroDev bundler RPC URL for account abstraction (NOTE: you can use any account abstraction bundler like Pimlico, Coinbase, etc)
BUNDLER_RPC_URL=https://rpc.zerodev.app/api/v3/YOUR_PROJECT_ID/chain/84532
```

## Usage

### Important Note on Passing Arguments
When using npm scripts with flags/options, use `--` to separate npm arguments from script arguments:
```bash
npm run upload -- ./myfile.pdf --encrypt
npm run list -- --detailed
```

### Development (with TypeScript compilation)
For development, you can run TypeScript files directly using tsx:

```bash
# Development commands (no build required)
npm run upload -- <file-path> [options]  # Encrypts with public access by default
npm run list -- [options]
npm run download -- <piece-cid> [options]
npm run balance
npm run deposit -- [options]
```

### Production (compiled JavaScript)
For production use, build first then use the compiled version:

```bash
npm run build
npm start
```

### Check Balance
View your wallet and Synapse balances:
```bash
npm run balance

# Direct command:
tsx src/commands/balance.ts
```

### Deposit USDFC
Deposit USDFC to Synapse and approve storage service:
```bash
# Default deposit (1 USDFC):
npm run deposit

# Specify custom amount:
npm run deposit -- --amount 5

# Or using direct command:
tsx src/commands/deposit.ts --amount 5

# Only approve spending (without depositing):
tsx src/commands/deposit.ts --approve-only
```

### Upload a File
Upload a file to Filecoin (encrypted with public access by default):
```bash
# Basic upload (encrypted, public - anyone can decrypt):
npm run upload -- ./myfile.pdf

# Upload with private encryption (NFT required for access):
npm run upload -- ./myfile.pdf --private

# Skip payment validation (if already funded):
npm run upload -- ./myfile.pdf --skip-payment-check

# Combined options:
npm run upload -- ./myfile.pdf --private --skip-payment-check

# Direct commands:
tsx src/commands/upload.ts ./myfile.pdf
tsx src/commands/upload.ts ./myfile.pdf --private
tsx src/commands/upload.ts ./myfile.pdf --unencrypted
```

### List Files
View encrypted files from your wallet:
```bash
# List your encrypted files:
npm run list

# Detailed list with metadata:
npm run list -- --detailed

# Direct commands:
tsx src/commands/list.ts
tsx src/commands/list.ts --detailed
```

### List Public Files
Discover public files from all users:
```bash
# List all public files:
npm run list-public

# With detailed metadata:
npm run list-public -- --detailed

# Limit number of files:
npm run list-public -- --limit 100

# Use custom API endpoint:
npm run list-public -- --api-url http://localhost:3000

# Direct command:
tsx src/commands/list-public.ts --detailed
```

### Download a File
Download a file using its Piece CID:
```bash
# Basic download (saves with original filename):
npm run download -- baga6ea4seaqabc123...

# Specify custom output path:
npm run download -- baga6ea4seaqabc123... --output ./downloads/myfile.pdf

# Direct commands:
tsx src/commands/download.ts baga6ea4seaqabc123...
tsx src/commands/download.ts baga6ea4seaqabc123... -o ./myfile.pdf
```

### Share Access
Grant access to encrypted files by minting NFTs to recipients:
```bash
# Share file access with another wallet:
npm run share -- <piece-cid> <recipient-address>

# With debug output:
npm run share -- <piece-cid> <recipient-address> --debug

# Direct command:
tsx src/commands/share.ts baga6ea4seaq... 0x123...
```

### Delete Files
Remove files and revoke all access permissions (NOTE: the file is not removed from storage, but permissions are revoked so the file is no longer decryptable, even if it's a public file):
```bash
# Delete a file by piece CID:
npm run delete -- <piece-cid>

# Direct command:
tsx src/commands/delete.ts baga6ea4seaq...
```

### Encryption/Decryption Features
The CLI uses end-to-end encryption by default with Lit Protocol v8 and smart contract-based access control:

- **Default Encryption**: All files are encrypted by default (public access unless specified)
- **Smart Contract Access Control**: Uses on-chain permission registry for fine-grained access control
- **Account Abstraction**: Integrates with ZeroDev for gasless transactions via account abstraction
- **Flexible Access**: Choose between public (anyone can decrypt) or private (NFT-gated) encryption
- **Automatic Permission Setup**: Deploys permission contracts and mints NFTs as needed
- **Automatic Decryption**: Download command automatically detects and decrypts encrypted files
- **Transparent Process**: Encryption status and access type shown in upload/download summaries

**How it works:**
1. By default, the CLI encrypts your file using Lit Protocol with public access (anyone can decrypt)
2. Use `--private` flag to require NFT ownership for decryption
3. Use `--unencrypted` flag to upload raw data without encryption
4. A smart contract is deployed to manage permissions for encrypted files
5. For private files, an NFT is minted to the file owner for access control
6. The encrypted file is uploaded to Filecoin storage
7. When downloading, the CLI automatically detects encrypted files and decrypts them
8. Access is verified via the smart contract before decryption is allowed

## Configuration

Edit `.env` to customize:

- `STORAGE_CAPACITY_GB`: Storage capacity in GB (default: 10)
- `PERSISTENCE_PERIOD_DAYS`: How long to store files (default: 30)
- `WITH_CDN`: Enable CDN for faster retrieval (default: true)
- `NETWORK`: Use "calibration" for testnet or "mainnet" for production

### Encryption Configuration (Required for --encrypt option)
- `REGISTRY_CONTRACT_ADDRESS`: Smart contract address for permission registry
- `VALIDATION_CONTRACT_ADDRESS`: Contract address for permission validation  
- `BUNDLER_RPC_URL`: Account abstraction bundler RPC URL for account abstraction. We used Zerodev (https://docs.zerodev.app/sdk/infra/intro) but it works with any AA bundler like Pimlico, Coinbase, etc.

## Project Structure

```
synapse-cli/
├── src/                # TypeScript source files
│   ├── commands/       # CLI commands
│   │   ├── upload.ts   # Upload files (with encryption support)
│   │   ├── list.ts     # List your encrypted files
│   │   ├── list-public.ts # List all public files
│   │   ├── download.ts # Download files (with decryption support)
│   │   ├── share.ts    # Share file access via NFT minting
│   │   ├── delete.ts   # Delete files and revoke permissions
│   │   ├── make-public.ts # Make files publicly accessible
│   │   ├── make-private.ts # Restrict file access
│   │   ├── balance.ts  # Check balances
│   │   └── deposit.ts  # Deposit funds
│   ├── utils/
│   │   ├── synapse.ts  # Synapse SDK wrapper
│   │   ├── keypo.ts    # Lit Protocol encryption/decryption utilities
│   │   ├── list.ts     # API client for querying encrypted files
│   │   ├── contracts.ts # Smart contract ABIs
│   │   ├── getKernelClient.ts # ZeroDev account abstraction client
│   │   ├── deployPermissionedData.ts # Permission contract deployment
│   │   ├── mintOwnerNFT.ts # NFT minting for access control
│   │   ├── generateRandomIdentifier.ts # Data identifier generation
│   │   └── types.ts    # TypeScript type definitions
│   ├── config.ts       # Configuration with types
│   └── index.ts        # Main CLI entry point
├── dist/               # Compiled JavaScript (after build)
├── .env                # Environment variables
├── tsconfig.json       # TypeScript configuration
├── package.json        # Dependencies
├── README.md           # This file
└── LOCAL_API_SERVER.md # Documentation for running your own API server
```

## Development

### Building
```bash
npm run build          # Compile TypeScript to JavaScript
npm run build:watch    # Watch mode for development
npm run clean          # Clean dist directory
```

### Running Development Commands
```bash
npm run dev            # Run main CLI in development
tsx src/commands/upload.ts <file>    # Run specific command
```

## Keypo API Integration

The CLI uses the Keypo API (api.keypo.io) to index and query encrypted files uploaded using Keypo's smart contracts. This API provides GraphQL-based access to file metadata, ownership, and access control information.

### Default API Endpoint
By default, the CLI uses the hosted Keypo API at `https://api.keypo.io` for querying encrypted files.

### Running Your Own Local API Server

You can run your own local implementation of the Keypo API for enhanced privacy, control, or custom features. The complete server implementation is documented in `LOCAL_API_SERVER.md`.

**Quick Setup:**
1. Follow the instructions in `LOCAL_API_SERVER.md` to set up your local server
2. Configure The Graph Protocol credentials in your API server's `.env`
3. Run the server: `npm run dev` (default: http://localhost:3000)
4. Use with CLI commands:
   ```bash
   # Use local API for list commands
   npm run list -- --api-url http://localhost:3000
   npm run list-public -- --api-url http://localhost:3000
   ```

### API Features
The Keypo API provides several endpoints for querying encrypted files:
- **filesByOwner**: Get files owned by a specific address (or all files)
- **filesByMinter**: Get files where an address has been granted access
- **fileMetadata**: Get detailed metadata for a specific file
- **isDeleted**: Check if files have been deleted

## Lit Protocol Integration

This CLI includes a complete Lit Protocol v8 integration with smart contract-based access control:

### Dependencies
- `@lit-protocol/lit-client@8.0.0-canary.4`
- `@lit-protocol/auth@8.0.0-canary.4`
- `@lit-protocol/access-control-conditions@8.0.0-canary.4`
- `@lit-protocol/networks@8.0.0-canary.4`
- `@zerodev/sdk` for account abstraction
- `@zerodev/ecdsa-validator` for signature validation

### Key Components

**Encryption Utilities (`src/utils/keypo.ts`)**:
- `preProcess()` - Converts various data types to Uint8Array for encryption
- `postProcess()` - Restores decrypted data to original format
- `encrypt()` - Encrypts data with smart contract access control
- `decrypt()` - Decrypts data with permission verification

**Smart Contract Integration**:
- Permission registry contract for access control
- Automatic contract deployment during encryption
- NFT minting for ownership verification
- On-chain permission checking before decryption

**Account Abstraction**:
- ZeroDev integration for gasless transactions
- EIP-7702 authorization for account abstraction
- Kernel v3.3 smart wallet implementation

### Type Safety Benefits
- **Complete TypeScript integration** with proper type definitions
- **Compile-time validation** of encryption/decryption flows
- **Interface definitions** for all encrypted data structures
- **Type-safe smart contract interactions** with ABIs

## Troubleshooting

### "Insufficient USDFC balance"
- Check your balance: `npm run balance`
- Get USDFC from the faucet (see Prerequisites)
- Deposit USDFC: `npm run deposit`

### "PRIVATE_KEY environment variable is required"
- Make sure you've created `.env` from `.env.example`
- Add your private key (without 0x prefix)

### Upload fails with payment errors
- Run `npm run deposit` to fund your account and approve the storage service
- Check that you have enough USDFC for the storage period

### Encryption/Decryption Issues
- **"Failed to verify signature"**: Ensure you're using the correct Lit Protocol package versions (`8.0.0-canary.4`)
- **Missing contract addresses**: Add `REGISTRY_CONTRACT_ADDRESS`, `VALIDATION_CONTRACT_ADDRESS`, and `BUNDLER_RPC_URL` to `.env`
- **Upload hangs during encryption**: Smart contract operations may timeout; operations have built-in timeouts and fallbacks
- **Permission denied on decrypt**: Ensure the wallet has permission via the smart contract or owns the NFT for the file

### Package Version Issues
If you encounter signature verification errors, ensure you have the exact package versions:
```bash
npm install @lit-protocol/access-control-conditions@8.0.0-canary.4 @lit-protocol/auth@8.0.0-canary.4 @lit-protocol/lit-client@8.0.0-canary.4 @lit-protocol/networks@8.0.0-canary.4 --exact
```

## License

MIT