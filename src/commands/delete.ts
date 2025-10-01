#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { getWalletAddress } from '../utils/synapse.js';
import { errorHandler } from '../utils/errorHandler.js';
import { EXIT_CODES } from '../constants.js';
import { list as listEncryptedFiles } from '../utils/list.js';
import { deleteData } from '../utils/keypo.js';
import { config } from '../config.js';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { KernelVersionToAddressesMap, KERNEL_V3_3 } from "@zerodev/sdk/constants";

const program = new Command();

interface DeleteOptions {
  debug?: boolean;
}

program
  .name('delete')
  .description('Delete an encrypted file by piece CID')
  .argument('<pieceCid>', 'The piece CID of the file to delete')
  .option('-d, --debug', 'Enable debug output')
  .action(async (pieceCid: string, options: DeleteOptions) => {
    const spinner = ora();
    errorHandler.setContext({ spinner, debug: options.debug || process.env.DEBUG === 'true' });
    
    try {
      // Get wallet address
      spinner.start('Getting wallet address...');
      const address = await getWalletAddress();
      spinner.succeed(`Connected with wallet: ${address}`);
      
      console.log(chalk.cyan('\n🗑️ Deleting File'));
      console.log(chalk.gray(`Piece CID: ${pieceCid}`));
      
      // Step 1: Find the file by piece CID
      spinner.start('Looking up file by piece CID...');
      const files = await listEncryptedFiles(address, false, undefined, {
        filterBy: {
          field: 'pieceCid',
          value: pieceCid,
          operator: 'equals'
        }
      });
      
      const fileEntries = Object.entries(files);
      
      // Check if file exists
      if (fileEntries.length === 0) {
        spinner.fail('File not found');
        console.log(chalk.red('\n❌ File not found.'));
        console.log(chalk.gray(`No encrypted file found with piece CID: ${pieceCid}`));
        process.exit(EXIT_CODES.ERROR);
      }
      
      if (fileEntries.length > 1) {
        spinner.warn('Multiple files found');
        console.log(chalk.yellow('\n⚠️  Multiple files found with the same piece CID. Using the first one.'));
      }
      
      const [dataIdentifier, fileData] = fileEntries[0];
      spinner.succeed('File found');
      
      console.log(chalk.green(`\n✅ File Details:`));
      console.log(chalk.gray(`  Name: ${fileData.dataMetadata?.name || 'Unknown'}`));
      console.log(chalk.gray(`  Data ID: ${dataIdentifier}`));
      console.log(chalk.gray(`  Access Type: ${fileData.dataMetadata?.accessType || 'private'}`));
      
      // Check if user is the owner
      if (fileData.owner?.toLowerCase() !== address.toLowerCase()) {
        spinner.fail('Permission denied');
        console.log(chalk.red('\n❌ You are not the owner of this file.'));
        console.log(chalk.gray(`File owner: ${fileData.owner}`));
        console.log(chalk.gray(`Your address: ${address}`));
        process.exit(EXIT_CODES.ERROR);
      }
      
      // Step 2: Prepare wallet and kernel client
      spinner.start('Preparing to delete file...');
      
      // Validate required configuration
      if (!config.registryContractAddress) {
        throw new Error('REGISTRY_CONTRACT_ADDRESS not configured');
      }
      if (!config.bundlerRpcUrl) {
        throw new Error('BUNDLER_RPC_URL not configured');
      }
      
      // Create wallet client
      const formattedPrivateKey = config.privateKey!.startsWith('0x') ? config.privateKey! : `0x${config.privateKey!}`;
      const account = privateKeyToAccount(formattedPrivateKey as `0x${string}`);
      
      const walletClient = createWalletClient({
        account: account,
        chain: baseSepolia,
        transport: http(),
      });
      
      // Get authorization for kernel account
      const kernelVersion = KERNEL_V3_3;
      const kernelAddresses = KernelVersionToAddressesMap[kernelVersion];
      const accountImplementationAddress = kernelAddresses.accountImplementationAddress;
      const authorization = await walletClient.signAuthorization({
        contractAddress: accountImplementationAddress as `0x${string}`,
        account: account,
      });
      
      spinner.succeed('Ready to delete file');
      
      // Step 3: Call the delete function
      spinner.start('Deleting file from registry...');
      
      const receipt = await deleteData(
        dataIdentifier,
        walletClient as any,
        authorization,
        config.registryContractAddress,
        config.bundlerRpcUrl,
        options.debug
      );
      
      spinner.succeed('File deleted successfully');
      
      console.log(chalk.green(`\n✅ File Deleted:`));
      console.log(chalk.gray(`  Transaction Hash: ${receipt.transactionHash}`));
      console.log(chalk.gray(`  File: ${fileData.dataMetadata?.name || 'Unknown'}`));
      console.log(chalk.blue('\n💡 The file has been removed from the permissions registry.'));
      console.log(chalk.yellow('⚠️  Note: The encrypted data may still exist on Filecoin storage.'));
      
      // Exit successfully
      process.exit(EXIT_CODES.SUCCESS);
    } catch (error) {
      errorHandler.handle(error);
    }
  });

program.parse();