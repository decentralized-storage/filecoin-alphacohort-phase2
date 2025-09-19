import { Synapse } from '@filoz/synapse-sdk';
import { ethers } from 'ethers';
import { createWalletClient, http, WalletClient, Account } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { filecoinCalibration, filecoin } from 'viem/chains';
import { config, validateConfig } from '../config.js';

let synapseInstance: Synapse | null = null;
let viemAccount: Account | null = null;
let viemWalletClient: WalletClient | null = null;

export async function getSynapse(): Promise<{ synapse: Synapse; viem: { viemAccount: Account; viemWalletClient: WalletClient } }> {
  if (synapseInstance && viemAccount && viemWalletClient) {
    return { synapse: synapseInstance, viem: { viemAccount, viemWalletClient } };
  }

  validateConfig();

  // Create wallet from private key
  const wallet = new ethers.Wallet(config.privateKey!);
  
  // Create provider based on network
  let provider: ethers.JsonRpcProvider;
  let rpcUrl: string;
  if (config.rpcUrl) {
    rpcUrl = config.rpcUrl;
    provider = new ethers.JsonRpcProvider(config.rpcUrl);
  } else {
    // Use default RPC URLs based on network
    rpcUrl = config.network === 'mainnet' 
      ? 'https://api.node.glif.io/rpc/v1'
      : 'https://api.calibration.node.glif.io/rpc/v1';
    provider = new ethers.JsonRpcProvider(rpcUrl);
  }
  
  // Connect wallet to provider
  const signer = wallet.connect(provider);

  // Create Synapse instance
  synapseInstance = await Synapse.create({
    signer,
    withCDN: config.withCDN,
    disableNonceManager: false,
  });

  // Create Viem account and wallet client
  viemAccount = privateKeyToAccount(`0x${config.privateKey}`);
  const chain = config.network === 'mainnet' ? filecoin : filecoinCalibration;
  
  viemWalletClient = createWalletClient({
    account: viemAccount,
    chain,
    transport: http(rpcUrl),
  });

  return { synapse: synapseInstance, viem: { viemAccount, viemWalletClient } };
}

export async function getWalletAddress(): Promise<string> {
  validateConfig();
  const wallet = new ethers.Wallet(config.privateKey!);
  return wallet.address;
}