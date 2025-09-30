#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { getSynapse, getWalletAddress } from '../utils/synapse.js';
import { errorHandler } from '../utils/errorHandler.js';
import { EXIT_CODES } from '../constants.js';
import { validateFileForConversion } from '../utils/fileConversion.js';

const program = new Command();

interface MakePublicOptions {
  force?: boolean;
}

program
  .name('make-public')
  .description('Convert a private encrypted file to public access (anyone can decrypt)')
  .argument('<pieceCid>', 'The piece CID of the private file to make public')
  .option('-f, --force', 'Skip confirmation prompt')
  .action(async (pieceCid: string, options: MakePublicOptions) => {
    const spinner = ora();
    errorHandler.setContext({ spinner, debug: process.env.DEBUG === 'true' });
    
    try {
      // Get wallet address
      spinner.start('Getting wallet address...');
      const address = await getWalletAddress();
      spinner.succeed(`Connected with wallet: ${address}`);
      
      console.log(chalk.cyan('\n🔄 Converting Private File to Public Access'));
      console.log(chalk.gray(`Piece CID: ${pieceCid}`));
      
      // Step 1: Get Synapse instance to access contracts
      spinner.start('Connecting to contracts...');
      const { synapse } = await getSynapse();
      spinner.succeed('Connected to contracts');
      
      // Step 2-6: Validate file and get contract address
      spinner.start('Looking up file by piece CID...');
      const result = await validateFileForConversion(pieceCid, 'private', 'public');
      
      if (!result.success) {
        spinner.fail('File validation failed');
        console.log(chalk.red(`\n❌ ${result.message}`));
        process.exit(EXIT_CODES.ERROR);
      }
      
      spinner.succeed('File contract address retrieved');
      
      // Placeholder warning
      console.log(chalk.yellow('\n⚠️  Warning: This will make the file publicly accessible!'));
      console.log(chalk.yellow('Anyone will be able to decrypt and download this file.'));
      
      // TODO: Continue with remaining logic:
      // - Update smart contract permissions (set tokenQuantity to 0)
      // - Update metadata to set accessType to 'public'
      // - Remove/burn the NFT (if applicable)
      
      console.log(chalk.blue('\n💡 Next steps (not yet implemented):'));
      console.log(chalk.gray('  • Update permission contract to set tokenQuantity = 0'));
      console.log(chalk.gray('  • Update metadata accessType to "public"'));
      console.log(chalk.gray('  • Remove NFT requirement for decryption'));
      console.log(chalk.gray('  • Maintain file encryption but allow public access'));
      
      // Exit successfully
      process.exit(EXIT_CODES.SUCCESS);
    } catch (error) {
      errorHandler.handle(error);
    }
  });

program.parse();