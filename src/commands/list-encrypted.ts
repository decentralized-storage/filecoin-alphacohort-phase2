#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { getWalletAddress } from '../utils/synapse.js';
import { list } from '../utils/list.js';
import { errorHandler } from '../utils/errorHandler.js';
import { EXIT_CODES } from '../constants.js';

const program = new Command();

interface ListEncryptedOptions {
  debug?: boolean;
  apiUrl?: string;
  filterField?: string;
  filterValue?: string;
  filterOperator?: 'equals' | 'contains' | 'startsWith' | 'endsWith';
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  pageSize?: string;
  maxPages?: string;
}

program
  .name('list-encrypted')
  .description('List all files stored on Filecoin (with pieceCID) from Keypo.io')
  .option('-d, --debug', 'Enable debug output')
  .option('--api-url <url>', 'Custom API URL (default: https://api.keypo.io)')
  .option('--filter-field <field>', 'Field to filter by (e.g., name, type, mimeType)')
  .option('--filter-value <value>', 'Value to filter for')
  .option('--filter-operator <op>', 'Filter operator: equals, contains, startsWith, endsWith', 'equals')
  .option('--sort-field <field>', 'Field to sort by (e.g., name, type)')
  .option('--sort-direction <dir>', 'Sort direction: asc or desc', 'asc')
  .option('--page-size <size>', 'Number of items per page', '100')
  .option('--max-pages <pages>', 'Maximum number of pages to fetch')
  .action(async (options: ListEncryptedOptions) => {
    const spinner = ora();
    errorHandler.setContext({ spinner, debug: options.debug || false });
    
    try {
      // Get wallet address
      spinner.start('Getting wallet address...');
      const address = await getWalletAddress();
      spinner.succeed(`Wallet address: ${address}`);

      // Build filter options
      const filterOptions: any = {};
      
      if (options.filterField && options.filterValue) {
        filterOptions.filterBy = {
          field: options.filterField,
          value: options.filterValue,
          operator: options.filterOperator
        };
      }
      
      if (options.sortField) {
        filterOptions.sortBy = {
          field: options.sortField,
          direction: options.sortDirection
        };
      }
      
      if (options.pageSize || options.maxPages) {
        filterOptions.pagination = {
          pageSize: options.pageSize ? parseInt(options.pageSize) : undefined,
          maxPages: options.maxPages ? parseInt(options.maxPages) : undefined
        };
      }

      // Fetch files with Filecoin storage
      spinner.start('Fetching files with Filecoin storage...');
      const files = await list(
        address,
        options.debug,
        options.apiUrl,
        Object.keys(filterOptions).length > 0 ? filterOptions : undefined
      );
      
      const fileCount = Object.keys(files).length;
      spinner.succeed(`Found ${fileCount} file(s) with pieceCID`);
      
      if (fileCount === 0) {
        console.log(chalk.yellow('\nNo files with Filecoin storage found.'));
        console.log(chalk.yellow('Only files uploaded to Filecoin have a pieceCID.'));
        process.exit(EXIT_CODES.SUCCESS);
      }

      console.log(chalk.cyan('\n📦 Files Stored on Filecoin:\n'));
      
      // Display each file
      Object.entries(files).forEach(([dataIdentifier, fileData]: [string, any], index) => {
        console.log(chalk.green(`${index + 1}. ${fileData.dataMetadata.name || 'Unnamed File'}`));
        console.log(chalk.gray(`   Data Identifier: ${dataIdentifier}`));
        console.log(chalk.gray(`   Piece CID: ${fileData.dataMetadata.pieceCid || fileData.cid || 'N/A'}`));
        console.log(chalk.gray(`   Type: ${fileData.dataMetadata.type || 'Unknown'}`));
        if (fileData.dataMetadata.mimeType) {
          console.log(chalk.gray(`   MIME Type: ${fileData.dataMetadata.mimeType}`));
        }
        console.log(chalk.gray(`   Owner: ${fileData.owner}`));
        console.log(chalk.gray(`   Access Minted: ${fileData.isAccessMinted ? 'Yes' : 'No'}`));
        console.log(chalk.gray(`   Contract: ${fileData.dataContractAddress}`));
        
        // Show user metadata if available
        if (fileData.dataMetadata.userMetaData) {
          try {
            const userMeta = JSON.parse(fileData.dataMetadata.userMetaData);
            if (Object.keys(userMeta).length > 0) {
              console.log(chalk.gray(`   User Metadata: ${JSON.stringify(userMeta, null, 2).split('\n').join('\n   ')}`));
            }
          } catch (e) {
            // If parsing fails, show as string
            console.log(chalk.gray(`   User Metadata: ${fileData.dataMetadata.userMetaData}`));
          }
        }
        
        console.log(''); // Empty line between files
      });
      
      // Summary
      console.log(chalk.cyan('📊 Summary:'));
      console.log(chalk.white(`  Total Files: ${fileCount}`));
      
      // Count by type
      const typeCount: Record<string, number> = {};
      Object.values(files).forEach((file: any) => {
        const type = file.dataMetadata.type || 'unknown';
        typeCount[type] = (typeCount[type] || 0) + 1;
      });
      
      if (Object.keys(typeCount).length > 1) {
        console.log(chalk.white('  By Type:'));
        Object.entries(typeCount).forEach(([type, count]) => {
          console.log(chalk.gray(`    ${type}: ${count}`));
        });
      }
      
      // Exit successfully
      process.exit(EXIT_CODES.SUCCESS);
    } catch (error) {
      errorHandler.handle(error);
    }
  });

program.parse();