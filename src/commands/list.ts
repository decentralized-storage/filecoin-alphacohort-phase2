#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { getSynapse, getWalletAddress } from '../utils/synapse.js';
import { WarmStorageService } from '@filoz/synapse-sdk/warm-storage';
import { PDPServer } from '@filoz/synapse-sdk';
import { errorHandler } from '../utils/errorHandler.js';
import { timestampToMs, bytesToMB, EXIT_CODES } from '../constants.js';

const program = new Command();

interface ListOptions {
  detailed?: boolean;
}

program
  .name('list')
  .description('List all uploaded files in your datasets')
  .option('--detailed', 'Show detailed information including provider info')
  .action(async (options: ListOptions) => {
    const spinner = ora();
    errorHandler.setContext({ spinner, debug: process.env.DEBUG === 'true' });
    
    try {
      // Initialize Synapse
      spinner.start('Connecting to Filecoin...');
      const { synapse } = await getSynapse();
      const address = await getWalletAddress();
      spinner.succeed(`Connected with wallet: ${address}`);

      // Get WarmStorageService
      spinner.start('Fetching datasets...');
      const warmStorageService = await WarmStorageService.create(
        synapse.getProvider(),
        synapse.getWarmStorageAddress()
      );

      // Get all datasets for the client
      const datasets = await warmStorageService.getClientDataSetsWithDetails(address);
      
      if (datasets.length === 0) {
        spinner.warn('No datasets found');
        console.log(chalk.yellow('\nYou have not uploaded any files yet.'));
        console.log(chalk.yellow('Use the upload command to upload your first file.'));
        process.exit(EXIT_CODES.SUCCESS);
      }

      spinner.succeed(`Found ${datasets.length} dataset(s)`);
      
      console.log(chalk.cyan('\n📦 Your Datasets:\n'));
      
      // Get provider information for detailed view
      const providerIds = options.detailed ? await warmStorageService.getApprovedProviderIds() : [];
      const providerIdToAddressMap = datasets.reduce((acc: Record<number, string>, dataset: any) => {
        acc[dataset.providerId] = dataset.payee;
        return acc;
      }, {});

      let totalPieces = 0;
      
      for (const dataset of datasets) {
        const datasetId = (dataset as any).id || (dataset as any).pdpVerifierDataSetId || 'Unknown';
        console.log(chalk.green(`Dataset ID: ${datasetId}`));
        console.log(chalk.gray(`  Provider ID: ${dataset.providerId}`));
        console.log(chalk.gray(`  CDN Enabled: ${dataset.withCDN}`));
        const ts = (dataset as any).timestamp;
        console.log(chalk.gray(`  Created: ${ts ? new Date(timestampToMs(Number(ts))).toLocaleString() : 'Unknown'}`));
        
        // Get dataset data (pieces) using PDPServer
        try {
          if (options.detailed) {
            spinner.start(`Fetching provider info for ${dataset.providerId}...`);
            const providerInfo = await synapse.getProviderInfo(dataset.providerId);
            const serviceURL = providerInfo?.products?.PDP?.data?.serviceURL;
            spinner.stop();
            
            if (serviceURL) {
              spinner.start('Fetching dataset pieces...');
              const pdpServer = new PDPServer(null, serviceURL);
              const datasetData = await pdpServer.getDataSet(dataset.pdpVerifierDataSetId);
              spinner.stop();
              
              if (datasetData && datasetData.pieces && datasetData.pieces.length > 0) {
                console.log(chalk.cyan(`  📄 Files (${datasetData.pieces.length}):`));
                totalPieces += datasetData.pieces.length;
                
                for (const piece of datasetData.pieces) {
                  // Extract CID using toString() method like the web app
                  let pieceCid = 'Unknown';
                  try {
                    if (piece.pieceCid && typeof piece.pieceCid.toString === 'function') {
                      pieceCid = piece.pieceCid.toString();
                    } else if (piece.subPieceCid && typeof piece.subPieceCid.toString === 'function') {
                      pieceCid = piece.subPieceCid.toString();
                    } else if (piece.pieceCid && typeof (piece.pieceCid as any)['/'] === 'string') {
                      pieceCid = (piece.pieceCid as any)['/'];
                    } else if (piece.subPieceCid && typeof (piece.subPieceCid as any)['/'] === 'string') {
                      pieceCid = (piece.subPieceCid as any)['/'];
                    } else {
                      pieceCid = `Piece ${piece.pieceId}`;
                    }
                  } catch (error) {
                    pieceCid = `Piece ${piece.pieceId} (CID error)`;
                  }
                  
                  const sizeVal = (piece as any).size;
                  const sizeInfo = sizeVal ? `${bytesToMB(Number(sizeVal))} MB` : 'Size unknown';
                  
                  console.log(chalk.white(`    Piece #${piece.pieceId}`));
                  console.log(chalk.gray(`      ${pieceCid}`));
                  console.log(chalk.gray(`      Size: ${sizeInfo}`));
                }
              } else {
                console.log(chalk.gray('  No files in this dataset'));
              }
              
              console.log(chalk.cyan('  Provider Details:'));
              console.log(chalk.gray(`    Name: ${providerInfo.name || 'Unknown'}`));
              console.log(chalk.gray(`    URL: ${serviceURL}`));
              const status = (providerInfo as any)?.status;
              console.log(chalk.gray(`    Status: ${status || 'Unknown'}`));
            } else {
              console.log(chalk.gray('  Provider service URL not available'));
            }
          } else {
            console.log(chalk.gray('  Use --detailed flag to see files and provider info'));
          }
        } catch (error) {
          spinner.stop();
          console.log(chalk.gray(`  Error fetching dataset details: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
        
        console.log(''); // Empty line between datasets
      }
      
      // Summary
      console.log(chalk.cyan('📊 Summary:'));
      console.log(chalk.white(`  Total Datasets: ${datasets.length}`));
      if (options.detailed) {
        console.log(chalk.white(`  Total Files: ${totalPieces}`));
      } else {
        console.log(chalk.gray('  Use --detailed to see file count'));
      }
      
      // Exit successfully
      process.exit(EXIT_CODES.SUCCESS);
    } catch (error) {
      errorHandler.handle(error);
    }
  });

program.parse();