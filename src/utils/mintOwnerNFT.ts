import { encodeFunctionData } from "viem";
import { type ContractInterface } from "ethers";
import { RETRY_CONFIG, calculateBackoffDelay } from '../constants.js';

export const mintOwnerNFT = async (
    kernelClient: any, // Using any for now since we need the kernel client's methods
    contractAddress: string,
    fileIdentifier: string,
    abi: ContractInterface,
    debug?: boolean,
    retryAttempts: number = RETRY_CONFIG.DEFAULT_ATTEMPTS,
    retryDelay: number = RETRY_CONFIG.BASE_DELAY_MS,
) => {
    if (debug) {
      console.log("[DEBUG] mintOwnerNFT called with:", {
        contractAddress,
        fileIdentifier,
        kernelClientAddress: kernelClient.account.address,
        retryAttempts
      });
    }

    const txData = encodeFunctionData({
      abi: abi as any,
      functionName: "mintFromPermissionedFileForOwner",
      args: [fileIdentifier, [kernelClient.account.address]]
    });

    if (debug) {
      console.log("[DEBUG] txData:", txData);
    }

    let lastError: any;
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        if (debug && attempt > 1) {
          console.log(`[DEBUG] Retry attempt ${attempt}/${retryAttempts} for mintOwnerNFT`);
        }

        // Add exponential backoff delay between retry attempts to allow network state to settle
        if (attempt > 1) {
          const backoffDelay = calculateBackoffDelay(attempt - 1, retryDelay);
          if (debug) {
            console.log(`[DEBUG] Waiting ${backoffDelay}ms before retry attempt ${attempt}`);
          }
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }

        // Prepare the user operation with explicit gas settings
        const userOperation = {
          callData: await kernelClient.account.encodeCalls([{
            to: contractAddress as `0x${string}`,
            value: BigInt(0),
            data: txData,
          }]),
          // Add explicit gas limits to help with simulation
          maxFeePerGas: undefined, // Let the bundler estimate
          maxPriorityFeePerGas: undefined, // Let the bundler estimate
        };

        if (debug) {
          console.log("[DEBUG] Sending user operation with callData:", userOperation.callData);
        }

        // Add timeout to sendUserOperation
        const userOpHash = await Promise.race([
          kernelClient.sendUserOperation(userOperation),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout: NFT mint sendUserOperation took too long')), 30000)
          )
        ]);

        if (debug) {
          console.log("[DEBUG] userOpHash:", userOpHash);
        }

        // Add timeout to waitForUserOperationReceipt
        const { receipt } = await Promise.race([
          kernelClient.waitForUserOperationReceipt({
            hash: userOpHash,
          }),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout: NFT mint waitForUserOperationReceipt took too long')), 60000)
          )
        ]);

        if (debug) {
          console.log("[DEBUG] receipt:", receipt);
          console.log("[DEBUG] mintOwnerNFT successful on attempt", attempt);
        }

        return receipt.transactionHash;
      } catch (error: any) {
        lastError = error;
        console.error(`Error on attempt ${attempt}/${retryAttempts}:`, error);
        
        // Log more detailed error information
        if (error.message) {
          console.error("Error message:", error.message);
        }
        if (error.cause) {
          console.error("Error cause:", error.cause);
        }
        
        // Check for specific error types
        if (error.message && error.message.includes("UserOperation reverted during simulation")) {
          console.error("UserOperation simulation failed - this could be due to:");
          console.error("1. Insufficient gas estimation");
          console.error("2. Contract state issues - the deployed contract might not be fully propagated");
          console.error("3. Network congestion");
          console.error("4. Invalid parameters");
          console.error("5. Timing issue - contract deployment may need more time to settle");
        }
        
        // If this is not the last attempt, continue to retry
        if (attempt < retryAttempts) {
          console.log(`Will retry in ${retryDelay}ms...`);
          continue;
        }
        
        // If all attempts failed, throw the last error
        break;
      }
    }
    
    console.error(`Failed to mint owner NFT after ${retryAttempts} attempts`);
    throw lastError;
};