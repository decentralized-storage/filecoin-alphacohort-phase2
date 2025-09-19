#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { getSynapse } from '../utils/synapse.js';
import { postProcess, decrypt } from '../utils/keypo.js';
import { validateLitConfig } from '../config.js';
import { errorHandler, createFileError, createEncryptionError } from '../utils/errorHandler.js';
import { TIME, bytesToMB, EXIT_CODES } from '../constants.js';

const program = new Command();

interface DownloadOptions {
  output?: string;
}

program
  .name('download')
  .description('Download a file from Filecoin using its Piece CID')
  .argument('<pieceCid>', 'The Piece CID of the file to download')
  .option('-o, --output <path>', 'Output file path (default: ./<pieceCid>)')
  .action(async (pieceCid: string, options: DownloadOptions) => {
    const spinner = ora();
    errorHandler.setContext({ spinner, debug: process.env.DEBUG === 'true' });
    
    try {
      // Initialize Synapse
      spinner.start('Connecting to Filecoin...');
      const { synapse, viem } = await getSynapse();
      spinner.succeed('Connected to Filecoin');

// Start download
      spinner.start(`Downloading file with CID: ${pieceCid}...`);
      const startTime = Date.now();
      
      try {
        // Download the file
        const uint8ArrayBytes = await synapse.storage.download(pieceCid);
        
        const downloadTime = ((Date.now() - startTime) / TIME.SECOND_MS).toFixed(2);
        spinner.succeed(`File downloaded in ${downloadTime}s`);

        // Determine output path

        // Check if the downloaded data is JSON (encrypted metadata)
        let finalData: string | Uint8Array;
        let isEncrypted = false;
        let absolutePath: string;
        
        try {
          const textDecoder = new TextDecoder();
          const decodedString = textDecoder.decode(uint8ArrayBytes);
          const jsonData: any = JSON.parse(decodedString);
          
          // Check if this is an encrypted payload
          if (jsonData.ciphertext && jsonData.dataToEncryptHash && jsonData.accessControlConditions) {
            // This is an encrypted payload
            isEncrypted = true;
            
            // Print the encrypted payload for debugging
            console.log('\n📦 Encrypted Payload Details:');
            console.log('🔐 Ciphertext:', jsonData.ciphertext);
            console.log('🔑 Data to encrypt hash:', jsonData.dataToEncryptHash);
            console.log('📋 Data identifier:', jsonData.dataIdentifier);
            console.log('📝 Metadata:', JSON.stringify(jsonData.metadata, null, 2));
            console.log('🔒 Access control conditions:', JSON.stringify(jsonData.accessControlConditions, null, 2));
            console.log('\n💾 Full payload:');
            console.log(JSON.stringify(jsonData, null, 2));
            console.log('\n');
            
            spinner.start('Decrypting file with Lit Protocol...');
            
            // Validate Lit Protocol configuration
            validateLitConfig();
            
            try {
              const { decryptedData, metadata } = await decrypt(viem.viemAccount, jsonData);
              const processedData = await postProcess(new Uint8Array(decryptedData), metadata);
              const fileName = metadata.name;
              const outputPath = options.output || `./${fileName}`;
              absolutePath = path.resolve(outputPath);
              
              // Convert processed data to writable format
              if (typeof Buffer !== 'undefined' && Buffer.isBuffer(processedData)) {
                finalData = processedData as unknown as Uint8Array;
              } else if (processedData instanceof Uint8Array) {
                finalData = processedData;
              } else if (processedData && ArrayBuffer.isView(processedData as any)) {
                const view = processedData as ArrayBufferView;
                finalData = Buffer.from(view.buffer, view.byteOffset, view.byteLength);
              } else if (processedData instanceof ArrayBuffer) {
                finalData = new Uint8Array(processedData as ArrayBuffer);
              } else {
                // Fallback: encode string or stringify object
                finalData = typeof processedData === 'string' 
                  ? new TextEncoder().encode(processedData)
                  : new TextEncoder().encode(JSON.stringify(processedData));
              }
              
              spinner.succeed('File decrypted successfully');
            } catch (decryptError) {
              throw createEncryptionError('Failed to decrypt file', {
                cause: decryptError,
                userMessage: `Failed to decrypt file\n${chalk.yellow('Make sure you have the correct wallet to decrypt this file.')}`,
                details: { pieceCid }
              });
            }
          } else {
            // This is an unencrypted payload with metadata
            const fileName = jsonData.metadata.name;
            // Reconstruct Uint8Array from JSON-serialized bytes
            const dataField = jsonData.data;
            let reconstructedBytes: Uint8Array;
            if (dataField instanceof Uint8Array) {
              reconstructedBytes = dataField;
            } else if (Array.isArray(dataField)) {
              reconstructedBytes = new Uint8Array(dataField);
            } else if (dataField && typeof dataField === 'object') {
              if (dataField.type === 'Buffer' && Array.isArray(dataField.data)) {
                reconstructedBytes = new Uint8Array(dataField.data);
              } else {
                const keys = Object.keys(dataField).map(Number).sort((a, b) => a - b);
                const arr = new Uint8Array(keys.length);
                for (const k of keys) arr[k] = Number(dataField[k]);
                reconstructedBytes = arr;
              }
            } else {
              throw createFileError('Unsupported data format in JSON payload', {
                userMessage: 'The downloaded file has an unsupported format.',
                details: { pieceCid }
              });
            }

            const processedData = await postProcess(reconstructedBytes, jsonData.metadata);
            const outputPath = options.output || `./${fileName}`;
            absolutePath = path.resolve(outputPath);

            // Assume postProcess returns a file in Node (Buffer). Coerce to binary for write.
            if (typeof Buffer !== 'undefined' && Buffer.isBuffer(processedData)) {
              finalData = processedData as unknown as Uint8Array;
            } else if (processedData instanceof Uint8Array) {
              finalData = processedData;
            } else if (processedData && ArrayBuffer.isView(processedData as any)) {
              const view = processedData as ArrayBufferView;
              finalData = Buffer.from(view.buffer, view.byteOffset, view.byteLength);
            } else if (processedData instanceof ArrayBuffer) {
              finalData = new Uint8Array(processedData as ArrayBuffer);
            } else {
              // Fallback: encode string or stringify object
              finalData = typeof processedData === 'string' 
                ? new TextEncoder().encode(processedData)
                : new TextEncoder().encode(JSON.stringify(processedData));
            }
          }
        } catch (e) {
          // Not JSON, treat as regular file
          isEncrypted = false;
          const outputPath = options.output || `./${pieceCid}`;
          absolutePath = path.resolve(outputPath);
          finalData = uint8ArrayBytes;
        }

        // Save the file
        spinner.start('Saving file...');
        await fs.writeFile(absolutePath, finalData);
        
        const stats = await fs.stat(absolutePath);
        const fileSizeInMB = bytesToMB(stats.size);
        
        spinner.succeed('File saved successfully!');
        
        // Display summary
        console.log(chalk.green('\n✅ Download complete!'));
        console.log(chalk.cyan('📄 Piece CID:'), pieceCid);
        console.log(chalk.cyan('📁 Saved to:'), absolutePath);
        console.log(chalk.cyan('📊 File size:'), `${fileSizeInMB} MB`);
        console.log(chalk.cyan('⏱️  Download time:'), `${downloadTime}s`);
        console.log(chalk.cyan('🔓 Decrypted:'), isEncrypted ? 'Yes' : 'No');
        
        // Exit successfully
        process.exit(EXIT_CODES.SUCCESS);
      } catch (downloadError) {
        if (downloadError instanceof Error && downloadError.message.includes('not found')) {
          throw createFileError('File not found', {
            cause: downloadError,
            userMessage: `File with Piece CID not found: ${pieceCid}\n${chalk.yellow('Make sure the CID is correct and the file exists in your datasets.')}\n${chalk.yellow('Use the "list" command to see available files.')}`,
            details: { pieceCid }
          });
        }
        throw downloadError;
      }
      
    } catch (error) {
      errorHandler.handle(error);
    }
  });

program.parse();