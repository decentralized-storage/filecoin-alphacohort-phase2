#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { errorHandler } from '../utils/errorHandler.js';
import { EXIT_CODES } from '../constants.js';

const program = new Command();

interface ListPublicOptions {
  detailed?: boolean;
  apiUrl?: string;
  limit?: string;
}

interface FileData {
  dataMetadata?: {
    name?: string;
    accessType?: string;
    pieceCid?: string;
    type?: string;
    userMetaData?: string;
    [key: string]: any;
  };
  dataContractAddress?: string;
  owner?: string;
  isAccessMinted?: boolean;
  cid?: string;
}

program
  .name('list-public')
  .description('List all public encrypted files from all users')
  .option('--detailed', 'Show detailed file information')
  .option('--api-url <url>', 'Custom API URL (default: https://api.keypo.io)')
  .option('--limit <number>', 'Maximum number of files to fetch (default: 1000)', '1000')
  .action(async (options: ListPublicOptions) => {
    const spinner = ora();
    errorHandler.setContext({ spinner, debug: process.env.DEBUG === 'true' });
    
    try {
      const baseUrl = options.apiUrl || 'https://api.keypo.io';
      const limit = parseInt(options.limit || '1000', 10);
      
      spinner.start('Fetching all encrypted files...');
      
      // Fetch files without specifying fileOwnerAddress to get all files
      const allFiles: Record<string, FileData> = {};
      let skip = 0;
      const batchSize = 100; // Fetch 100 at a time
      let hasMore = true;
      
      while (hasMore && skip < limit) {
        try {
          const currentBatch = Math.min(batchSize, limit - skip);
          const response = await fetch(`${baseUrl}/graph/filesByOwner?skip=${skip}&first=${currentBatch}`);
          
          if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
          }
          
          const data = await response.json();
          const { permissionedFileDeployeds = [], permissionedFileDeleteds = [] } = data;
          
          // Check if we got any results
          if (permissionedFileDeployeds.length === 0) {
            hasMore = false;
            break;
          }
          
          // Process deployed files
          for (const file of permissionedFileDeployeds) {
            try {
              const metadata = JSON.parse(file.fileMetadata || '{}');
              
              // Extract piece CID from nested structure
              const pieceCid = metadata.filecoinStorageInfo?.pieceCid || 
                             metadata.pieceCid || 
                             metadata.cid;
              
              // Create file entry
              allFiles[file.fileIdentifier] = {
                dataMetadata: metadata,
                dataContractAddress: file.fileContractAddress,
                owner: file.fileOwner,
                isAccessMinted: false, // We don't have this info from this endpoint
                cid: pieceCid
              };
            } catch (e) {
              // Skip files with invalid metadata
              console.warn(`Skipping file with invalid metadata: ${file.fileIdentifier}`);
            }
          }
          
          // Remove deleted files
          for (const deleted of permissionedFileDeleteds) {
            delete allFiles[deleted.fileIdentifier];
          }
          
          skip += currentBatch;
          spinner.text = `Fetched ${skip} files...`;
        } catch (error) {
          spinner.fail(`Error fetching batch at skip=${skip}`);
          console.error(error);
          break;
        }
      }
      
      spinner.succeed(`Fetched ${Object.keys(allFiles).length} total files`);
      
      // Filter for public files
      spinner.start('Filtering for public files...');
      const publicFiles = Object.entries(allFiles).filter(([, file]) => {
        return file.dataMetadata?.accessType === 'public';
      });
      
      spinner.succeed(`Found ${publicFiles.length} public file(s)`);
      
      if (publicFiles.length === 0) {
        console.log(chalk.yellow('\nNo public files found.'));
        console.log(chalk.gray('Public files are encrypted files that anyone can decrypt.'));
        process.exit(EXIT_CODES.SUCCESS);
      }
      
      console.log(chalk.cyan('\n🌍 Public Encrypted Files (from all users):\n'));
      
      // Group by owner for better organization
      const filesByOwner: Record<string, Array<[string, FileData]>> = {};
      for (const [dataIdentifier, file] of publicFiles) {
        const owner = file.owner || 'Unknown';
        if (!filesByOwner[owner]) {
          filesByOwner[owner] = [];
        }
        filesByOwner[owner].push([dataIdentifier, file]);
      }
      
      // Display files grouped by owner
      for (const [owner, files] of Object.entries(filesByOwner)) {
        console.log(chalk.blue(`👤 Owner: ${owner}`));
        console.log(chalk.gray(`  Files: ${files.length}`));
        
        for (const [dataIdentifier, file] of files) {
          const metadata = file.dataMetadata;
          const fileName = metadata?.name || 'Unknown';
          const pieceCid = metadata?.filecoinStorageInfo?.pieceCid || 
                          metadata?.pieceCid || 
                          file.cid || 
                          'Unknown';
          
          console.log(chalk.white(`\n  📄 ${fileName}`));
          console.log(chalk.gray(`    Data ID: ${dataIdentifier}`));
          console.log(chalk.gray(`    Piece CID: ${pieceCid}`));
          
          if (options.detailed) {
            console.log(chalk.gray(`    Contract: ${file.dataContractAddress || 'Unknown'}`));
            
            // Use the metadata directly since it already contains all the information
            if (metadata?.filecoinStorageInfo?.uploadTimestamp) {
              const uploadDate = new Date(metadata.filecoinStorageInfo.uploadTimestamp);
              console.log(chalk.gray(`    Uploaded: ${uploadDate.toLocaleString()}`));
            }
            if (metadata?.filecoinStorageInfo?.datasetCreated !== undefined) {
              console.log(chalk.gray(`    Dataset Created: ${metadata.filecoinStorageInfo.datasetCreated ? 'Yes' : 'No'}`));
            }
            if (metadata?.type) {
              console.log(chalk.gray(`    File Type: ${metadata.type}`));
            }
          }
        }
        console.log('');
      }
      
      // Summary
      console.log(chalk.cyan('📊 Summary:'));
      console.log(chalk.white(`  Total Public Files: ${publicFiles.length}`));
      console.log(chalk.white(`  Total Owners: ${Object.keys(filesByOwner).length}`));
      console.log(chalk.green('\n💡 These files can be decrypted by anyone using the download command.'));
      
      if (!options.detailed) {
        console.log(chalk.gray('\n  Use --detailed flag to see more information'));
      }
      
      // Exit successfully
      process.exit(EXIT_CODES.SUCCESS);
    } catch (error) {
      errorHandler.handle(error);
    }
  });

program.parse();