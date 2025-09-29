#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { getSynapse, getWalletAddress } from '../utils/synapse.js';
import { config, validateLitConfig } from '../config.js';
import { TOKENS, TIME_CONSTANTS } from '@filoz/synapse-sdk';
import { ethers } from 'ethers';
import { preProcess, encrypt, deployPermissionsAndMintNFT } from '../utils/keypo.js';
import { errorHandler, createFileError, createPaymentError, createEncryptionError, ErrorCategory } from '../utils/errorHandler.js';
import { bytesToMB, formatUSDFC, TOKEN_AMOUNTS, BALANCE_THRESHOLDS, EXIT_CODES } from '../constants.js';

const program = new Command();

interface UploadOptions {
  skipPaymentCheck?: boolean;
  encrypt?: boolean;
}

program
  .name('upload')
  .description('Upload a file to Filecoin via Synapse')
  .argument('<file>', 'Path to the file to upload')
  .option('--skip-payment-check', 'Skip payment validation (use if already funded)')
  .option('--encrypt', 'Encrypt the file before uploading using Lit Protocol')
  .action(async (filePath: string, options: UploadOptions) => {
    const spinner = ora();
    errorHandler.setContext({ spinner, debug: process.env.DEBUG === 'true' });
    
    try {
      // Check if file exists
      spinner.start('Checking file...');
      let stats;
      let fileName: string;
      let fileSize: number;
      
      try {
        stats = await fs.stat(filePath);
        fileName = path.basename(filePath);
        fileSize = stats.size;
        spinner.succeed(`File: ${fileName} (${bytesToMB(fileSize)} MB)`);
      } catch (fileError) {
        throw createFileError(`Cannot access file: ${filePath}`, {
          cause: fileError,
          userMessage: `File not found or cannot be accessed: ${filePath}`,
          details: { filePath }
        });
      }

      // Initialize Synapse first (needed for address)
      spinner.start('Connecting to Filecoin...');
      const { synapse, viem } = await getSynapse();
      const address = await getWalletAddress();
      spinner.succeed(`Connected with wallet: ${address}`);

      // Read file
      spinner.start('Reading file...');
      const fileBuffer = await fs.readFile(filePath);
      const { dataOut, metadataOut } = await preProcess(fileBuffer, fileName);
      spinner.succeed('File loaded');

      let uint8ArrayBytes: Uint8Array;
      let smartContractData: any = null; // Store smart contract data for post-upload operations
      let dataIdentifier: string | null = null; // Store data identifier for smart contract operations
      
      if (options.encrypt) {
        // Validate Lit Protocol configuration
        validateLitConfig();
        
        // Encrypt the data
        spinner.start('Encrypting file with Lit Protocol...');
        try {
          const encryptedPayload = await encrypt(
            config.privateKey!, 
            dataOut, 
            metadataOut,
            config.registryContractAddress!,
            config.validationContractAddress!,
            config.bundlerRpcUrl!
          );
          
          // Store smart contract data and data identifier for later use
          smartContractData = encryptedPayload.smartContractData;
          dataIdentifier = encryptedPayload.dataIdentifier;
          
          // Create the payload without smart contract data for Filecoin upload
          const uploadPayload = {
            ciphertext: encryptedPayload.ciphertext,
            dataToEncryptHash: encryptedPayload.dataToEncryptHash,
            accessControlConditions: encryptedPayload.accessControlConditions,
            metadata: encryptedPayload.metadata,
            dataIdentifier: encryptedPayload.dataIdentifier,
          };
          
          const encryptedData = JSON.stringify(uploadPayload);
          uint8ArrayBytes = new TextEncoder().encode(encryptedData);
          spinner.succeed('File encrypted');
        } catch (encryptError) {
          throw createEncryptionError('Failed to encrypt file', {
            cause: encryptError,
            userMessage: 'Failed to encrypt file. Please check your Lit Protocol configuration.',
            details: { fileName }
          });
        }
      } else {
        // Create a JSON object with the data and metadata (unencrypted)
        const data = JSON.stringify({
          data: Array.from(dataOut),
          metadata: metadataOut
        });
        uint8ArrayBytes = new TextEncoder().encode(data);
      }

      // Check payment if not skipped
      if (!options.skipPaymentCheck) {
        // Check datasets first to determine if we need dataset creation fee
        spinner.start('Checking datasets...');
        const datasets = await synapse.storage.findDataSets(address);
        const hasDataset = datasets.length > 0;
        spinner.succeed(hasDataset ? 'Dataset found' : 'No dataset found (will create)');
        spinner.start('Checking USDFC balance...');
        const balance = await synapse.payments.walletBalance(TOKENS.USDFC);
        const balanceFormatted = formatUSDFC(balance);
        
        // Calculate minimum balance needed including potential dataset creation fee
        const minimumBalance = hasDataset ? 
          BALANCE_THRESHOLDS.UPLOAD_MIN_BALANCE : 
          BALANCE_THRESHOLDS.UPLOAD_MIN_BALANCE + formatUSDFC(TOKEN_AMOUNTS.DATA_SET_CREATION_FEE);
        
        if (balanceFormatted < minimumBalance) {
          const errorMessage = hasDataset ? 
            `Insufficient USDFC balance: ${balanceFormatted} USDFC` :
            `Insufficient USDFC balance for new dataset: ${balanceFormatted} USDFC (needs ${minimumBalance} USDFC for dataset creation fee)`;
          
          throw createPaymentError(errorMessage, {
            userMessage: `${errorMessage}\n${chalk.yellow('Please fund your wallet with USDFC:')}\n${chalk.yellow('Faucet: https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc')}`,
            details: { balance: balanceFormatted, required: minimumBalance, hasDataset }
          });
        }
        spinner.succeed(`USDFC balance: ${balanceFormatted} USDFC`);

        // Approve and deposit if needed
        spinner.start('Checking storage allowances...');
        const paymentsAddress = synapse.getPaymentsAddress();
        const allowance = await synapse.payments.allowance(paymentsAddress, TOKENS.USDFC);
        
        if (allowance < TOKEN_AMOUNTS.MIN_ALLOWANCE) {
          spinner.text = 'Approving USDFC spending...';
          const approveTx = await synapse.payments.approve(
            paymentsAddress,
            ethers.MaxUint256,
            TOKENS.USDFC
          );
          await approveTx.wait();
        }

        const synapseBalance = await synapse.payments.balance(TOKENS.USDFC);
        const minimumSynapseBalance = hasDataset ? 
          TOKEN_AMOUNTS.MIN_SYNAPSE_BALANCE : 
          TOKEN_AMOUNTS.MIN_SYNAPSE_BALANCE + TOKEN_AMOUNTS.DATA_SET_CREATION_FEE;
          
        if (synapseBalance < minimumSynapseBalance) {
          spinner.text = 'Depositing USDFC to Synapse...';
          const depositAmount = hasDataset ? 
            TOKEN_AMOUNTS.DEFAULT_DEPOSIT : 
            TOKEN_AMOUNTS.DEFAULT_DEPOSIT + TOKEN_AMOUNTS.DATA_SET_CREATION_FEE;
          const depositTx = await synapse.payments.deposit(depositAmount, TOKENS.USDFC);
          await depositTx.wait();
        }

        // If no dataset exists, ensure proper warm storage service approval for dataset creation
        if (!hasDataset) {
          spinner.text = 'Setting up storage service for new dataset...';
          const { WarmStorageService } = await import('@filoz/synapse-sdk/warm-storage');
          const warmStorageService = await WarmStorageService.create(
            synapse.getProvider(),
            synapse.getWarmStorageAddress()
          );
          
          // Calculate required allowances for dataset creation  
          const storageCapacityBytes = config.storageCapacity * 1024 * 1024 * 1024; // Convert GB to bytes
          const epochRate = BigInt(storageCapacityBytes) / TOKEN_AMOUNTS.RATE_DIVISOR;
          const lockupAmount = epochRate * TIME_CONSTANTS.EPOCHS_PER_DAY * BigInt(config.persistencePeriod);
          const lockupAmountWithFee = lockupAmount + TOKEN_AMOUNTS.DATA_SET_CREATION_FEE;
          
          const approveTx = await synapse.payments.approveService(
            synapse.getWarmStorageAddress(),
            epochRate,
            lockupAmountWithFee,
            TIME_CONSTANTS.EPOCHS_PER_DAY * BigInt(config.persistencePeriod)
          );
          await approveTx.wait();
        }
        spinner.succeed('Payment validated');
      } else {
        // Still need to check datasets for the storage service
        spinner.start('Checking datasets...');
        const datasets = await synapse.storage.findDataSets(address);
        const hasDataset = datasets.length > 0;
        spinner.succeed(hasDataset ? 'Dataset found' : 'No dataset found (will create)');
      }

      // Create storage service
      spinner.start('Initializing storage service...');
      let datasetCreated = false;
      const storageService = await synapse.createStorage({
        callbacks: {
          onDataSetResolved: () => {
            spinner.text = 'Dataset resolved';
          },
          onDataSetCreationStarted: () => {
            spinner.text = 'Creating dataset on blockchain...';
            datasetCreated = true;
          },
          onDataSetCreationProgress: (status) => {
            if (status.transactionSuccess) {
              spinner.text = 'Dataset transaction confirmed';
            }
            if (status.serverConfirmed) {
              spinner.text = 'Dataset ready';
            }
          },
          onProviderSelected: (provider) => {
            spinner.text = `Storage provider selected: ${provider.name}`;
          },
        },
      });
      spinner.succeed('Storage service ready');

      // Upload file
      spinner.start('Uploading file to storage provider...');
      let pieceCidResult: string | null = null;
      
      const { pieceCid } = await storageService.upload(uint8ArrayBytes, {
        onUploadComplete: (piece) => {
          pieceCidResult = piece.toV1().toString();
          spinner.text = 'File uploaded! Adding to dataset...';
        },
        onPieceAdded: (transactionResponse) => {
          if (transactionResponse) {
            spinner.text = `Confirming transaction: ${transactionResponse.hash}`;
          }
        },
        onPieceConfirmed: () => {
          spinner.text = 'File added to dataset';
        },
      });

      spinner.succeed('Upload complete!');

      // Deploy smart contracts after successful Filecoin upload (for encrypted files)
      if (options.encrypt && smartContractData && dataIdentifier) {
        spinner.start('Deploying permission contracts...');
        try {
          // Create enhanced metadata that includes the piece CID
          const metadataWithPieceCid = {
            ...metadataOut,
            filecoinStorageInfo: {
              pieceCid: pieceCid.toV1().toString(),
              uploadTimestamp: new Date().toISOString(),
              datasetCreated: datasetCreated
            }
          };

          await deployPermissionsAndMintNFT(
            dataIdentifier, // Use the correct data identifier from the encrypted payload
            metadataWithPieceCid, // Pass enhanced metadata with piece CID
            smartContractData.kernelClient,
            smartContractData.userAddress,
            smartContractData.registryContractAddress,
            smartContractData.validationContractAddress
          );
          spinner.succeed('Smart contracts deployed!');
        } catch (contractError) {
          // Log error but don't fail the upload since file is already on Filecoin
          console.warn(chalk.yellow('\n⚠️  Smart contract deployment failed, but file upload succeeded'));
          console.warn(chalk.yellow('Error:'), contractError instanceof Error ? contractError.message : String(contractError));
        }
      }

      
      console.log(chalk.green('\n✅ File successfully uploaded to Filecoin!'));
      console.log(chalk.cyan('📁 File Name:'), fileName);
      console.log(chalk.cyan('📊 File Size:'), `${bytesToMB(fileSize)} MB`);
      console.log(chalk.cyan('🔗 Piece CID:'), pieceCid.toV1().toString());
      console.log(chalk.cyan('💾 Dataset Created:'), datasetCreated ? 'Yes' : 'No (existing used)');
      console.log(chalk.cyan('🔐 Encrypted:'), options.encrypt ? 'Yes' : 'No');
      if (options.encrypt) {
        console.log(chalk.cyan('📋 Data Identifier:'), dataIdentifier || 'N/A');
        console.log(chalk.cyan('⛓️  Smart Contracts:'), smartContractData ? 'Deployed with Piece CID metadata' : 'Not deployed');
      }
      
      // Exit successfully
      process.exit(EXIT_CODES.SUCCESS);
    } catch (error) {
      errorHandler.handle(error);
    }
  });

program.parse();