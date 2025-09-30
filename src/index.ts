#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';

const program = new Command();

program
  .name('synapse-cli')
  .description('CLI tool for uploading, viewing, and downloading files from Filecoin using Synapse SDK')
  .version('1.0.0');

program
  .command('upload <file>')
  .description('Upload a file to Filecoin')
  .option('--skip-payment-check', 'Skip payment validation')
  .action(async () => {
    await import('./commands/upload.js');
  });

program
  .command('list')
  .description('List all uploaded files')
  .option('--detailed', 'Show detailed information')
  .action(async () => {
    await import('./commands/list.js');
  });

program
  .command('download <pieceCid>')
  .description('Download a file by Piece CID')
  .option('-o, --output <path>', 'Output file path')
  .action(async () => {
    await import('./commands/download.js');
  });

program
  .command('balance')
  .description('Check wallet and Synapse balances')
  .action(async () => {
    await import('./commands/balance.js');
  });

program
  .command('deposit')
  .description('Deposit USDFC and approve storage service')
  .option('-a, --amount <amount>', 'Amount to deposit', '1')
  .option('--approve-only', 'Only approve spending')
  .action(async () => {
    await import('./commands/deposit.js');
  });

program
  .command('list-encrypted')
  .description('List encrypted files with Filecoin storage from Keypo.io')
  .option('-d, --debug', 'Enable debug output')
  .option('--api-url <url>', 'Custom API URL')
  .option('--filter-field <field>', 'Field to filter by')
  .option('--filter-value <value>', 'Value to filter for')
  .option('--sort-field <field>', 'Field to sort by')
  .action(async () => {
    await import('./commands/list-encrypted.js');
  });

// Add help text
program.addHelpText('after', `
Examples:
  $ synapse-cli balance                    Check your balances
  $ synapse-cli deposit --amount 5         Deposit 5 USDFC
  $ synapse-cli upload ./myfile.pdf        Upload a file
  $ synapse-cli list --detailed            List files with details
  $ synapse-cli list-encrypted             List encrypted files with pieceCid
  $ synapse-cli download baga6ea4seaq...   Download by CID

For more information, see the README.md file.
`);

program.parse();