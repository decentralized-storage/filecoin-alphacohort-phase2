import { createPublicClient, http } from "viem";
import { create7702KernelAccount, create7702KernelAccountClient } from "@zerodev/ecdsa-validator";
import { createZeroDevPaymasterClient, getUserOperationGasPrice } from "@zerodev/sdk";
import { getEntryPoint, KERNEL_V3_3 } from "@zerodev/sdk/constants";

// Helper to create a kernel client from a userSigner
export async function getKernelClient(
  userSigner: any, 
  chain: any, 
  bundlerRpcUrl: string, 
  authorization: any,
  debug?: boolean
) {
    if (debug) {
      console.log("[DEBUG] getKernelClient called with:", {
        userSigner,
        chain,
        bundlerRpcUrl,
        authorization
      });
    }
    
    try {
      console.log("[DEBUG] Creating public client...");
      const publicClient = createPublicClient({
        transport: http(bundlerRpcUrl),
        chain,
      });
      if (debug) {
        console.log("[DEBUG] publicClient created");
      }

      console.log("[DEBUG] Creating kernel account...");
      const account = await Promise.race([
        create7702KernelAccount(publicClient, {
          signer: userSigner,
          entryPoint: getEntryPoint("0.7"),
          kernelVersion: KERNEL_V3_3,
          eip7702Auth: authorization
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout: create7702KernelAccount took too long')), 30000)
        )
      ]);
      if (debug) {
        console.log("[DEBUG] kernelAccount:", account);
      }

      console.log("[DEBUG] Creating paymaster client...");
      const paymasterClient = createZeroDevPaymasterClient({
        chain,
        transport: http(bundlerRpcUrl),
      });
      if (debug) {
        console.log("[DEBUG] paymasterClient created");
      }

      console.log("[DEBUG] Creating kernel client...");
      const kernelClient = await Promise.race([
        create7702KernelAccountClient({
          account,
          chain,
          bundlerTransport: http(bundlerRpcUrl),
          paymaster: paymasterClient,
          client: publicClient,
          userOperation: {
            estimateFeesPerGas: async ({ bundlerClient }: { bundlerClient: any }) => {
              try {
                return await getUserOperationGasPrice(bundlerClient);
              } catch (error: any) {
                if (debug) {
                  console.warn("[DEBUG] Gas price estimation failed, using fallback:", error.message);
                }
                // Fallback gas price estimation
                return {
                  maxFeePerGas: BigInt(2000000000), // 2 gwei
                  maxPriorityFeePerGas: BigInt(1000000000), // 1 gwei
                };
              }
            }
          }
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout: create7702KernelAccountClient took too long')), 30000)
        )
      ]);
      if (debug) {
        console.log("[DEBUG] kernelClient:", kernelClient);
      }
      return kernelClient;
    } catch (error: any) {
      console.error("Error creating kernel client:", error);
      if (debug) {
        console.error("Error details:", {
          message: error.message,
          cause: error.cause,
          stack: error.stack
        });
      }
      throw error;
    }
}