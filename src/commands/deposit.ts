#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { getSynapse, getWalletAddress } from '../utils/synapse.js';
import { TOKENS, TIME_CONSTANTS } from '@filoz/synapse-sdk';
import { ethers } from 'ethers';
import { config } from '../config.js';
import { errorHandler, createPaymentError } from '../utils/errorHandler.js';
import { formatUSDFC, parseUSDFC, storageCapacityToBytes, TOKEN_AMOUNTS, EXIT_CODES } from '../constants.js';

const program = new Command();

interface DepositOptions {
  amount: string;
  approveOnly?: boolean;
}

program
  .name('deposit')
  .description('Deposit USDFC and approve storage service')
  .option('-a, --amount <amount>', 'Amount of USDFC to deposit', '1')
  .option('--approve-only', 'Only approve spending without depositing')
  .action(async (options: DepositOptions) => {
    const spinner = ora();
    errorHandler.setContext({ spinner, debug: process.env.DEBUG === 'true' });
    
    try {
      // Initialize Synapse
      spinner.start('Connecting to Filecoin...');
      const { synapse } = await getSynapse();
      const address = await getWalletAddress();
      spinner.succeed(`Connected with wallet: ${address}`);

      // Check current balance
      spinner.start('Checking balances...');
      const usdfcWalletBalance = await synapse.payments.walletBalance(TOKENS.USDFC);
      const usdfcWalletFormatted = formatUSDFC(usdfcWalletBalance);
      const usdfcSynapseBalance = await synapse.payments.balance(TOKENS.USDFC);
      const usdfcSynapseFormatted = formatUSDFC(usdfcSynapseBalance);
      spinner.succeed('Balances checked');

      console.log(chalk.cyan('\n💰 Current Balances:'));
      console.log(chalk.white('  Wallet USDFC:'), chalk.green(`${usdfcWalletFormatted} USDFC`));
      console.log(chalk.white('  Synapse USDFC:'), chalk.green(`${usdfcSynapseFormatted} USDFC`));

      if (usdfcWalletFormatted < parseFloat(options.amount) && !options.approveOnly) {
        throw createPaymentError(`Insufficient USDFC balance`, {
          userMessage: `Insufficient USDFC balance. You need at least ${options.amount} USDFC but have ${usdfcWalletFormatted} USDFC`,
          details: { required: parseFloat(options.amount), available: usdfcWalletFormatted }
        });
      }

      // Confirm action
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: options.approveOnly 
            ? 'Approve Warm Storage service for spending?' 
            : `Deposit ${options.amount} USDFC to Synapse?`,
          default: true,
        },
      ]);

      if (!confirm) {
        console.log(chalk.yellow('\nOperation cancelled'));
        process.exit(EXIT_CODES.SUCCESS);
      }

      const paymentsAddress = synapse.getPaymentsAddress();

      if (!options.approveOnly) {
        // Check and set allowance
        spinner.start('Checking USDFC allowance...');
        const allowance = await synapse.payments.allowance(paymentsAddress, TOKENS.USDFC);
        
        if (allowance < parseUSDFC(options.amount)) {
          spinner.text = 'Approving USDFC spending...';
          const approveTx = await synapse.payments.approve(
            paymentsAddress,
            ethers.MaxUint256,
            TOKENS.USDFC
          );
          spinner.text = `Waiting for approval transaction: ${approveTx.hash}`;
          await approveTx.wait();
          spinner.succeed('USDFC spending approved');
        } else {
          spinner.succeed('USDFC allowance sufficient');
        }

        // Deposit USDFC
        spinner.start(`Depositing ${options.amount} USDFC...`);
        const depositAmount = parseUSDFC(options.amount);
        const depositTx = await synapse.payments.deposit(depositAmount, TOKENS.USDFC);
        spinner.text = `Waiting for deposit transaction: ${depositTx.hash}`;
        await depositTx.wait();
        spinner.succeed(`Successfully deposited ${options.amount} USDFC`);
      }

      // Approve Warm Storage service
      spinner.start('Approving Warm Storage service...');
      
      // Calculate allowances based on config
      const storageCapacityBytes = storageCapacityToBytes(config.storageCapacity);
      const epochRate = storageCapacityBytes / TOKEN_AMOUNTS.RATE_DIVISOR;
      const lockupAmount = epochRate * TIME_CONSTANTS.EPOCHS_PER_DAY * BigInt(config.persistencePeriod);
      
      const approveTx = await synapse.payments.approveService(
        synapse.getWarmStorageAddress(),
        epochRate,
        lockupAmount,
        TIME_CONSTANTS.EPOCHS_PER_DAY * BigInt(config.persistencePeriod)
      );
      
      spinner.text = `Waiting for service approval: ${approveTx.hash}`;
      await approveTx.wait();
      spinner.succeed('Warm Storage service approved');

      // Final balance check
      if (!options.approveOnly) {
        spinner.start('Checking final balances...');
        const finalSynapseBalance = await synapse.payments.balance(TOKENS.USDFC);
        const finalSynapseFormatted = formatUSDFC(finalSynapseBalance);
        spinner.succeed('Final balance checked');

        console.log(chalk.green('\n✅ Transaction complete!'));
        console.log(chalk.cyan('  New Synapse balance:'), chalk.green(`${finalSynapseFormatted} USDFC`));
      } else {
        console.log(chalk.green('\n✅ Service approval complete!'));
      }

      console.log(chalk.cyan('\n📝 Service Allowances Set:'));
      console.log(chalk.white('  Storage Capacity:'), `${config.storageCapacity} GB`);
      console.log(chalk.white('  Persistence Period:'), `${config.persistencePeriod} days`);
      console.log(chalk.white('  CDN Enabled:'), config.withCDN ? 'Yes' : 'No');
      
      // Exit successfully
      process.exit(EXIT_CODES.SUCCESS);
    } catch (error) {
      errorHandler.handle(error);
    }
  });

program.parse();