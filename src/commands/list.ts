#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { getWalletAddress } from '../utils/synapse.js';
import { errorHandler } from '../utils/errorHandler.js';
import { EXIT_CODES } from '../constants.js';
import { list as listEncryptedFiles } from '../utils/list.js';

const program = new Command();

interface ListOptions {
  detailed?: boolean;
}

program
  .name('list')
  .description('List all uploaded encrypted files')
  .option('--detailed', 'Show detailed file information')
  .action(async (options: ListOptions) => {
    const spinner = ora();
    errorHandler.setContext({ spinner, debug: process.env.DEBUG === 'true' });
    
    try {
      // Get wallet address
      spinner.start('Getting wallet address...');
      const address = await getWalletAddress();
      spinner.succeed(`Connected with wallet: ${address}`);
      
      // Fetch encrypted files from Keypo.io API
      spinner.start('Fetching encrypted files...');
      const encryptedFiles = await listEncryptedFiles(address, false);
      const fileEntries = Object.entries(encryptedFiles);
      
      if (fileEntries.length === 0) {
        spinner.warn('No encrypted files found');
        console.log(chalk.yellow('\nYou have not uploaded any encrypted files yet.'));
        console.log(chalk.yellow('Use the upload command with --encrypt flag to upload encrypted files.'));
        process.exit(EXIT_CODES.SUCCESS);
      }

      spinner.succeed(`Found ${fileEntries.length} encrypted file(s)`);
      
      console.log(chalk.cyan('\n🔐 Your Encrypted Files:\n'));
      
      // Group files by access type
      const publicFiles = fileEntries.filter(([, file]) => {
        // Access type is now directly available in dataMetadata
        return file.dataMetadata?.accessType === 'public';
      });
      
      const privateFiles = fileEntries.filter(([, file]) => {
        // Access type is now directly available in dataMetadata  
        return file.dataMetadata?.accessType === 'private' || !file.dataMetadata?.accessType; // Default to private if not specified
      });
      
      // Display public files
      if (publicFiles.length > 0) {
        console.log(chalk.blue('📢 Public Files (anyone can decrypt):'));
        displayFiles(publicFiles, options.detailed || false);
        console.log('');
      }
      
      // Display private files
      if (privateFiles.length > 0) {
        console.log(chalk.magenta('🔒 Private Files:'));
        displayFiles(privateFiles, options.detailed || false);
        console.log('');
      }
      
      // Summary
      console.log(chalk.cyan('📊 Summary:'));
      console.log(chalk.white(`  Total Encrypted Files: ${fileEntries.length}`));
      console.log(chalk.blue(`    📢 Public: ${publicFiles.length}`));
      console.log(chalk.magenta(`    🔒 Private: ${privateFiles.length}`));
      
      if (!options.detailed) {
        console.log(chalk.gray('\n  Use --detailed flag to see more information'));
      }
      
      // Exit successfully
      process.exit(EXIT_CODES.SUCCESS);
    } catch (error) {
      errorHandler.handle(error);
    }
  });

function displayFiles(files: [string, any][], detailed: boolean) {
  for (const [dataIdentifier, file] of files) {
    const metadata = file.dataMetadata;
    const fileName = metadata?.name || 'Unknown';
    const pieceCid = metadata?.pieceCid || file.cid || 'Unknown';
    
    // Parse complete metadata from userMetaData (which now contains the full metadata)
    let fullMetadata = {};
    try {
      fullMetadata = JSON.parse(metadata?.userMetaData || '{}');
    } catch {
      // Ignore parsing errors
    }
    
    console.log(chalk.white(`  📄 ${fileName}`));
    console.log(chalk.gray(`    Data ID: ${dataIdentifier}`));
    console.log(chalk.gray(`    Piece CID: ${pieceCid}`));
    
    if (detailed) {
      console.log(chalk.gray(`    Contract: ${file.dataContractAddress || 'Unknown'}`));
      console.log(chalk.gray(`    Owner: ${file.owner || 'Unknown'}`));
      console.log(chalk.gray(`    Access NFT: ${file.isAccessMinted ? 'Minted ✓' : 'Not minted'}`));
      
      // Show additional metadata if available
      const info = fullMetadata as any;
      if (info.filecoinStorageInfo?.uploadTimestamp) {
        const uploadDate = new Date(info.filecoinStorageInfo.uploadTimestamp);
        console.log(chalk.gray(`    Uploaded: ${uploadDate.toLocaleString()}`));
      }
      if (info.filecoinStorageInfo?.datasetCreated !== undefined) {
        console.log(chalk.gray(`    Dataset Created: ${info.filecoinStorageInfo.datasetCreated ? 'Yes' : 'No'}`));
      }
      if (metadata?.type) {
        console.log(chalk.gray(`    File Type: ${metadata.type}`));
      }
    }
    
    console.log('');
  }
}

program.parse();