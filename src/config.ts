import dotenv from 'dotenv';
import { SIZE_CONSTANTS } from '@filoz/synapse-sdk';
import { createConfigError } from './utils/errorHandler.js';
import { STORAGE_DEFAULTS, VALIDATION } from './constants.js';

dotenv.config();

export interface Config {
  network: 'mainnet' | 'calibration';
  privateKey?: string;
  rpcUrl?: string;
  storageCapacity: number;
  persistencePeriod: number;
  minDaysThreshold: number;
  withCDN: boolean;
  readonly storageCapacityBytes: bigint;
  registryContractAddress?: string;
  validationContractAddress?: string;
  bundlerRpcUrl?: string;
}

export const config: Config = {
  // Network configuration
  network: (process.env.NETWORK as 'mainnet' | 'calibration') || 'calibration',
  privateKey: process.env.PRIVATE_KEY,
  rpcUrl: process.env.RPC_URL,
  
  // Storage configuration
  storageCapacity: parseInt(process.env.STORAGE_CAPACITY_GB || STORAGE_DEFAULTS.CAPACITY_GB.toString()),
  persistencePeriod: parseInt(process.env.PERSISTENCE_PERIOD_DAYS || STORAGE_DEFAULTS.PERSISTENCE_DAYS.toString()),
  minDaysThreshold: parseInt(process.env.MIN_DAYS_THRESHOLD || STORAGE_DEFAULTS.MIN_DAYS_THRESHOLD.toString()),
  withCDN: process.env.WITH_CDN === 'true',
  
  // Lit Protocol smart contract configuration
  registryContractAddress: process.env.REGISTRY_CONTRACT_ADDRESS,
  validationContractAddress: process.env.VALIDATION_CONTRACT_ADDRESS,
  bundlerRpcUrl: process.env.BUNDLER_RPC_URL,
  
  // Calculated values
  get storageCapacityBytes(): bigint {
    return BigInt(this.storageCapacity) * SIZE_CONSTANTS.GiB;
  }
};

// Validate required configuration
export function validateConfig(): void {
  if (!config.privateKey) {
    throw createConfigError('PRIVATE_KEY environment variable is required', {
      userMessage: 'Private key not configured. Please set PRIVATE_KEY in your .env file.',
      details: { missing: 'PRIVATE_KEY' }
    });
  }
  
  if (!VALIDATION.VALID_NETWORKS.includes(config.network as any)) {
    throw createConfigError('Invalid network configuration', {
      userMessage: `NETWORK must be either "${VALIDATION.VALID_NETWORKS[0]}" or "${VALIDATION.VALID_NETWORKS[1]}"`,
      details: { network: config.network, allowed: VALIDATION.VALID_NETWORKS }
    });
  }
}

// Validate Lit Protocol configuration for encryption
export function validateLitConfig(): void {
  validateConfig(); // Basic validation first
  
  if (!config.registryContractAddress) {
    throw createConfigError('Missing encryption configuration', {
      userMessage: 'REGISTRY_CONTRACT_ADDRESS is required for encryption. Please set it in your .env file.',
      details: { missing: 'REGISTRY_CONTRACT_ADDRESS' }
    });
  }
  
  if (!config.validationContractAddress) {
    throw createConfigError('Missing encryption configuration', {
      userMessage: 'VALIDATION_CONTRACT_ADDRESS is required for encryption. Please set it in your .env file.',
      details: { missing: 'VALIDATION_CONTRACT_ADDRESS' }
    });
  }
  
  if (!config.bundlerRpcUrl) {
    throw createConfigError('Missing encryption configuration', {
      userMessage: 'BUNDLER_RPC_URL is required for encryption. Please set it in your .env file.',
      details: { missing: 'BUNDLER_RPC_URL' }
    });
  }
}