# Synapse CLI

A TypeScript Node.js command-line interface for uploading, viewing, and downloading files from Filecoin using the Synapse SDK.

## Features

- 📤 **Upload** files to Filecoin via Synapse
- 📋 **List** all uploaded files in your datasets
- 📥 **Download** files using their Piece CID
- 💰 **Check balances** (FIL and USDFC)
- 💳 **Deposit** USDFC and manage storage allowances
- 🔐 **Encryption/Decryption** with Lit Protocol v8 and smart contract access control
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

1. Clone or create this project:
```bash
cd /Users/davidblumenfeld/synapse-cli
```

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

# ZeroDev bundler RPC URL for account abstraction
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
npm run upload -- <file-path> [options]
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
Upload a file to Filecoin with optional encryption:
```bash
# Basic upload (unencrypted):
npm run upload -- ./myfile.pdf

# Upload with encryption (using Lit Protocol):
npm run upload -- ./myfile.pdf --encrypt

# Skip payment validation (if already funded):
npm run upload -- ./myfile.pdf --skip-payment-check

# Combined options:
npm run upload -- ./myfile.pdf --encrypt --skip-payment-check

# Direct commands:
tsx src/commands/upload.ts ./myfile.pdf
tsx src/commands/upload.ts ./myfile.pdf --encrypt
```

### List Files
View all your uploaded files:
```bash
# Basic list (shows dataset info only):
npm run list

# Detailed list (includes file pieces and provider info):
npm run list -- --detailed

# Direct commands:
tsx src/commands/list.ts
tsx src/commands/list.ts --detailed
```

### Download a File
Download a file using its Piece CID (automatically decrypts if encrypted):
```bash
# Basic download (saves with original filename):
npm run download -- baga6ea4seaqabc123...

# Specify custom output path:
npm run download -- baga6ea4seaqabc123... --output ./downloads/myfile.pdf

# Direct commands:
tsx src/commands/download.ts baga6ea4seaqabc123...
tsx src/commands/download.ts baga6ea4seaqabc123... -o ./myfile.pdf
```

### Encryption/Decryption Features
The CLI supports end-to-end encryption using Lit Protocol v8 with smart contract-based access control:

- **Smart Contract Access Control**: Uses on-chain permission registry for fine-grained access control
- **Account Abstraction**: Integrates with ZeroDev for gasless transactions via account abstraction  
- **Uploading with Encryption**: Add `--encrypt` flag to encrypt files before upload
- **Automatic Permission Setup**: Deploys permission contracts and mints owner NFTs automatically
- **Automatic Decryption**: Download command automatically detects and decrypts encrypted files
- **Transparent Process**: Encryption status is shown in upload/download summaries

**How it works:**
1. When uploading with `--encrypt`, the CLI encrypts your file using Lit Protocol
2. A smart contract is deployed to manage permissions for the encrypted file
3. An NFT is minted to the file owner for access control
4. The encrypted file is uploaded to Filecoin storage
5. When downloading, the CLI automatically detects encrypted files and decrypts them
6. Access is verified via the smart contract before decryption is allowed

## Configuration

Edit `.env` to customize:

- `STORAGE_CAPACITY_GB`: Storage capacity in GB (default: 10)
- `PERSISTENCE_PERIOD_DAYS`: How long to store files (default: 30)
- `WITH_CDN`: Enable CDN for faster retrieval (default: true)
- `NETWORK`: Use "calibration" for testnet or "mainnet" for production

### Encryption Configuration (Required for --encrypt option)
- `REGISTRY_CONTRACT_ADDRESS`: Smart contract address for permission registry
- `VALIDATION_CONTRACT_ADDRESS`: Contract address for permission validation  
- `BUNDLER_RPC_URL`: ZeroDev bundler RPC URL for account abstraction

## Project Structure

```
synapse-cli/
├── src/                # TypeScript source files
│   ├── commands/       # CLI commands
│   │   ├── upload.ts   # Upload files (with encryption support)
│   │   ├── list.ts     # List datasets
│   │   ├── download.ts # Download files (with decryption support)
│   │   ├── balance.ts  # Check balances
│   │   └── deposit.ts  # Deposit funds
│   ├── utils/
│   │   ├── synapse.ts  # Synapse SDK wrapper
│   │   ├── keypo.ts    # Lit Protocol encryption/decryption utilities
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
└── README.md          # This file
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