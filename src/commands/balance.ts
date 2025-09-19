#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { getSynapse, getWalletAddress } from '../utils/synapse.js';
import { TOKENS } from '@filoz/synapse-sdk';
import { ethers } from 'ethers';
import { errorHandler } from '../utils/errorHandler.js';
import { formatUSDFC, CHAIN_IDS, BALANCE_THRESHOLDS, EXIT_CODES } from '../constants.js';

const program = new Command();

program
  .name('balance')
  .description('Check wallet and Synapse balances')
  .action(async () => {
    const spinner = ora();
    errorHandler.setContext({ spinner, debug: process.env.DEBUG === 'true' });
    
    try {
      // Initialize Synapse
      spinner.start('Connecting to Filecoin...');
      const { synapse } = await getSynapse();
      const address = await getWalletAddress();
      spinner.succeed(`Connected with wallet: ${address}`);

      // Get balances
      spinner.start('Fetching balances...');
      
      // FIL balance
      const filBalance = await synapse.payments.walletBalance();
      const filFormatted = ethers.formatEther(filBalance);
      
      // USDFC balance (wallet)
      const usdfcWalletBalance = await synapse.payments.walletBalance(TOKENS.USDFC);
      const usdfcWalletFormatted = formatUSDFC(usdfcWalletBalance);
      
      // USDFC balance (Synapse)
      const usdfcSynapseBalance = await synapse.payments.balance(TOKENS.USDFC);
      const usdfcSynapseFormatted = formatUSDFC(usdfcSynapseBalance);
      
      spinner.succeed('Balances fetched');
      
      // Display balances
      console.log(chalk.cyan('\n💰 Wallet Balances:\n'));
      console.log(chalk.white('  FIL:'), chalk.green(`${filFormatted} FIL`));
      console.log(chalk.white('  USDFC:'), chalk.green(`${usdfcWalletFormatted} USDFC`));
      
      console.log(chalk.cyan('\n🏦 Synapse Deposits:\n'));
      console.log(chalk.white('  USDFC:'), chalk.green(`${usdfcSynapseFormatted} USDFC`));
      
      // Check if balances are sufficient
      if (usdfcWalletFormatted < BALANCE_THRESHOLDS.LOW_BALANCE_WARNING) {
        console.log(chalk.yellow('\n⚠️  Low USDFC balance in wallet'));
        console.log(chalk.yellow('   You may need to fund your wallet to upload files.'));
        
        if (synapse.getChainId() === CHAIN_IDS.CALIBRATION) {
          console.log(chalk.cyan('\n   Get USDFC from faucet:'));
          console.log(chalk.cyan('   https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc'));
        }
      }
      
      if (usdfcSynapseFormatted < BALANCE_THRESHOLDS.LOW_BALANCE_WARNING && usdfcWalletFormatted >= BALANCE_THRESHOLDS.DEPOSIT_SUGGESTION_MIN) {
        console.log(chalk.yellow('\n💡 Tip: You have USDFC in your wallet but not deposited to Synapse.'));
        console.log(chalk.yellow('   Use the deposit command to fund your storage operations.'));
      }
      
      // Exit successfully
      process.exit(EXIT_CODES.SUCCESS);
    } catch (error) {
      errorHandler.handle(error);
    }
  });

program.parse();