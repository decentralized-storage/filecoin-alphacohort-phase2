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

      // Check datasets
      spinner.start('Checking datasets...');
      const datasets = await synapse.storage.findDataSets(address);
      const hasDataset = datasets.length > 0;
      spinner.succeed(hasDataset ? 'Dataset found' : 'No dataset found (will create)');

      // Check payment if not skipped
      if (!options.skipPaymentCheck) {
        spinner.start('Checking USDFC balance...');
        const balance = await synapse.payments.walletBalance(TOKENS.USDFC);
        const balanceFormatted = formatUSDFC(balance);
        
        if (balanceFormatted < BALANCE_THRESHOLDS.UPLOAD_MIN_BALANCE) {
          throw createPaymentError(`Insufficient USDFC balance: ${balanceFormatted} USDFC`, {
            userMessage: `Insufficient USDFC balance: ${balanceFormatted} USDFC\n${chalk.yellow('Please fund your wallet with USDFC:')}\n${chalk.yellow('Faucet: https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc')}`,
            details: { balance: balanceFormatted, required: 1 }
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
        if (synapseBalance < TOKEN_AMOUNTS.MIN_SYNAPSE_BALANCE) {
          spinner.text = 'Depositing USDFC to Synapse...';
          const depositAmount = TOKEN_AMOUNTS.DEFAULT_DEPOSIT;
          const depositTx = await synapse.payments.deposit(depositAmount, TOKENS.USDFC);
          await depositTx.wait();
        }
        spinner.succeed('Payment validated');
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