import chalk from 'chalk';
import { ethers } from 'ethers';
import { getWalletAddress } from './synapse.js';
import { list as listEncryptedFiles } from './list.js';
import { PermissionsRegistryAbi } from './contracts.js';
import { config } from '../config.js';
import { EXIT_CODES } from '../constants.js';

export interface FileConversionResult {
  success: boolean;
  dataIdentifier?: string;
  fileData?: any;
  fileContractAddress?: string;
  message?: string;
}

export async function validateFileForConversion(
  pieceCid: string,
  expectedCurrentType: 'public' | 'private',
  targetType: 'public' | 'private'
): Promise<FileConversionResult> {
  try {
    // Get wallet address
    const address = await getWalletAddress();
    
    // Step 1: Call list command, filtering by pieceCID
    const files = await listEncryptedFiles(address, false, undefined, {
      filterBy: {
        field: 'pieceCid',
        value: pieceCid,
        operator: 'equals'
      }
    });
    
    const fileEntries = Object.entries(files);
    
    // Step 2: Check if file exists
    if (fileEntries.length === 0) {
      return {
        success: false,
        message: "File doesn't exist."
      };
    }
    
    if (fileEntries.length > 1) {
      console.log(chalk.yellow('\n⚠️  Multiple files found with the same piece CID. Using the first one.'));
    }
    
    const [dataIdentifier, fileData] = fileEntries[0];
    
    console.log(chalk.green(`\n✅ File Details:`));
    console.log(chalk.gray(`  Name: ${fileData.dataMetadata?.name || 'Unknown'}`));
    console.log(chalk.gray(`  Data ID: ${dataIdentifier}`));
    console.log(chalk.gray(`  Current Access Type: ${fileData.dataMetadata?.accessType || 'Unknown'}`));
    
    // Step 3: Check if file is already the target type
    if (fileData.dataMetadata?.accessType === targetType) {
      return {
        success: false,
        message: `File is already ${targetType}.`
      };
    }
    
    // Step 4: Verify file is the expected current type
    if (fileData.dataMetadata?.accessType !== expectedCurrentType) {
      return {
        success: false,
        message: `File access type is '${fileData.dataMetadata?.accessType}', expected '${expectedCurrentType}'. Only ${expectedCurrentType} files can be converted to ${targetType}.`
      };
    }
    
    // Step 5: Get file smart contract address from permissions registry
    try {
      const registryAddress = config.registryContractAddress;
      if (!registryAddress) {
        throw new Error('REGISTRY_CONTRACT_ADDRESS not configured in environment variables');
      }
      
      // Create a provider for Base Sepolia (where the registry contract is deployed)
      const baseSepoliaProvider = new ethers.JsonRpcProvider('https://sepolia.base.org');
      
      // Create a contract instance for the permissions registry
      const registryContract = new ethers.Contract(registryAddress, PermissionsRegistryAbi, baseSepoliaProvider);
      
      // Debug information
      console.log(chalk.gray(`\n🔍 Debug Info:`));
      console.log(chalk.gray(`  Registry Address: ${registryAddress}`));
      console.log(chalk.gray(`  Data Identifier: ${dataIdentifier}`));
      console.log(chalk.gray(`  Network: ${await baseSepoliaProvider.getNetwork().then(n => `${n.name} (${n.chainId})`)}`));
      
      const fileContractAddress = await registryContract.fileIdentifierToFileContract(dataIdentifier);
      
      if (fileContractAddress === ethers.ZeroAddress) {
        throw new Error('File contract not found in registry');
      }
      
      console.log(chalk.green(`\n✅ File Contract Found:`));
      console.log(chalk.gray(`  Contract Address: ${fileContractAddress}`));
      console.log(chalk.gray(`  Registry Address: ${registryAddress}`));
      
      return {
        success: true,
        dataIdentifier,
        fileData,
        fileContractAddress
      };
      
    } catch (contractError) {
      return {
        success: false,
        message: `Failed to retrieve file contract address: ${contractError instanceof Error ? contractError.message : String(contractError)}`
      };
    }
    
  } catch (error) {
    return {
      success: false,
      message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}