#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { getSynapse, getWalletAddress } from '../utils/synapse.js';
import { errorHandler } from '../utils/errorHandler.js';
import { EXIT_CODES } from '../constants.js';
import { validateFileForConversion } from '../utils/fileConversion.js';

const program = new Command();

interface MakePrivateOptions {
  recipient?: string;
  force?: boolean;
}

program
  .name('make-private')
  .description('Convert a public encrypted file to private access (NFT required)')
  .argument('<pieceCid>', 'The piece CID of the public file to make private')
  .option('-r, --recipient <address>', 'Wallet address to mint the NFT to (default: your wallet)')
  .option('-f, --force', 'Skip confirmation prompt')
  .action(async (pieceCid: string, options: MakePrivateOptions) => {
    const spinner = ora();
    errorHandler.setContext({ spinner, debug: process.env.DEBUG === 'true' });
    
    try {
      // Get wallet address
      spinner.start('Getting wallet address...');
      const address = await getWalletAddress();
      spinner.succeed(`Connected with wallet: ${address}`);
      
      const recipient = options.recipient || address;
      
      console.log(chalk.cyan('\n🔄 Converting Public File to Private Access'));
      console.log(chalk.gray(`Piece CID: ${pieceCid}`));
      console.log(chalk.gray(`NFT Recipient: ${recipient}`));
      
      // Step 1: Get Synapse instance to access contracts
      spinner.start('Connecting to contracts...');
      const { synapse } = await getSynapse();
      spinner.succeed('Connected to contracts');
      
      // Step 2-6: Validate file and get contract address
      spinner.start('Looking up file by piece CID...');
      const result = await validateFileForConversion(pieceCid, 'public', 'private');
      
      if (!result.success) {
        spinner.fail('File validation failed');
        console.log(chalk.red(`\n❌ ${result.message}`));
        process.exit(EXIT_CODES.ERROR);
      }
      
      spinner.succeed('File contract address retrieved');
      
      // TODO: Continue with remaining logic:
      // - Update smart contract permissions (set tokenQuantity to 1)
      // - Update metadata to set accessType to 'private'
      // - Mint an NFT to the specified recipient
      
      console.log(chalk.blue('\n💡 Next steps (not yet implemented):'));
      console.log(chalk.gray('  • Update permission contract to set tokenQuantity = 1'));
      console.log(chalk.gray('  • Update metadata accessType to "private"'));
      console.log(chalk.gray('  • Mint access NFT to specified recipient'));
      
      // Exit successfully
      process.exit(EXIT_CODES.SUCCESS);
    } catch (error) {
      errorHandler.handle(error);
    }
  });

program.parse();