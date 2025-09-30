import { DataMetadata, TypedArray, BrowserFile, BrowserBlob } from './types.js';
import { createLitClient } from "@lit-protocol/lit-client";
import { encodeFunctionData } from 'viem';
import { nagaDev } from "@lit-protocol/networks";
import { createAuthManager, storagePlugins } from "@lit-protocol/auth";
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http, Client, Transport, Chain, Account } from 'viem';
import { baseSepolia } from 'viem/chains';
import { getKernelClient } from './getKernelClient.js';
import { 
  KernelVersionToAddressesMap, 
  KERNEL_V3_3 
} from "@zerodev/sdk/constants";
import { generateRandomDataIdentifier } from './generateRandomIdentifier.js';
import { deployPermissionedData, PermissionParameters } from './deployPermissionedData.js';
import { mintOwnerNFT } from './mintOwnerNFT.js';
import { PermissionsRegistryAbi } from './contracts.js';
import { AUTH_EXPIRATION, LIT_PROTOCOL } from '../constants.js';

// Check if we're in a browser environment where File and Blob are available
const isBrowser = typeof window !== 'undefined' && typeof File !== 'undefined' && typeof Blob !== 'undefined';

/**
 * Prepares data for encryption by converting it to a Uint8 byte array and setting appropriate metadata.
 * Supports multiple input types including files, strings, numbers, and objects.
 */
export async function preProcess(
  dataIn: BrowserFile | BrowserBlob | ArrayBuffer | Buffer | string | number | bigint | boolean | object | null | undefined | TypedArray,
  name: string,
  debug?: boolean,
  metadataIn?: Record<string, any>
): Promise<{ dataOut: Uint8Array; metadataOut: DataMetadata }> {
  let dataOut: Uint8Array;
  const metadataOut: DataMetadata = {
    name,
    type: 'unknown',
    userMetaData: metadataIn
  };

  if (debug) {
    console.log('preProcess input:', {
      name,
      type: typeof dataIn,
      isFile: isBrowser && dataIn instanceof File,
      isBlob: isBrowser && dataIn instanceof Blob,
      isArrayBuffer: dataIn instanceof ArrayBuffer,
      isBuffer: Buffer.isBuffer(dataIn),
      isTypedArray: ArrayBuffer.isView(dataIn),
      constructor: dataIn?.constructor?.name,
      value: isBrowser && dataIn instanceof File ? dataIn.name : dataIn
    });
  }

  if (dataIn === null || dataIn === undefined) {
    dataOut = new Uint8Array();
    metadataOut.type = 'null';
  } else if (isBrowser && (dataIn instanceof File || dataIn instanceof Blob)) {
    const arrayBuffer = await dataIn.arrayBuffer();
    dataOut = new Uint8Array(arrayBuffer);
    metadataOut.type = 'file';
    metadataOut.mimeType = dataIn instanceof File ? dataIn.type : dataIn.type;
  } else if (dataIn instanceof ArrayBuffer || Buffer.isBuffer(dataIn) || ArrayBuffer.isView(dataIn)) {
    if (ArrayBuffer.isView(dataIn)) {
      dataOut = new Uint8Array(dataIn.buffer, dataIn.byteOffset, dataIn.byteLength);
    } else {
      dataOut = new Uint8Array(dataIn);
    }
    metadataOut.type = Buffer.isBuffer(dataIn) ? 'buffer' : ArrayBuffer.isView(dataIn) ? 'typedarray' : 'arraybuffer';
    if (ArrayBuffer.isView(dataIn)) {
      metadataOut.arrayType = dataIn.constructor.name;
    }
  } else if (typeof dataIn === 'string') {
    dataOut = new TextEncoder().encode(dataIn);
    metadataOut.type = 'string';
  } else if (typeof dataIn === 'number' || typeof dataIn === 'bigint') {
    dataOut = new TextEncoder().encode(dataIn.toString());
    metadataOut.type = 'number';
    if (typeof dataIn === 'bigint') {
      metadataOut.subtype = 'bigint';
    }
  } else if (typeof dataIn === 'boolean') {
    dataOut = new TextEncoder().encode(dataIn.toString());
    metadataOut.type = 'boolean';
  } else if (typeof dataIn === 'object') {
    if (dataIn instanceof Map) {
      dataOut = new TextEncoder().encode(JSON.stringify(Object.fromEntries(dataIn)));
      metadataOut.subtype = 'map';
    } else if (dataIn instanceof Set) {
      dataOut = new TextEncoder().encode(JSON.stringify(Array.from(dataIn)));
      metadataOut.subtype = 'set';
    } else {
      dataOut = new TextEncoder().encode(JSON.stringify(dataIn));
      metadataOut.subtype = 'json';
    }
    metadataOut.type = 'object';
  } else {
    throw new Error(`Unsupported data type: ${typeof dataIn}`);
  }

  if (debug) {
    console.log('preProcess output:', {
      dataLength: dataOut.length,
      metadata: metadataOut
    });
  }

  return { dataOut, metadataOut };
} 

/**
 * Restores decrypted data to its original format using the metadata that was stored during encryption.
 * This function is the inverse operation of preProcess, converting the standardized Uint8Array format back to the original data type.
 */
export function postProcess<T extends BrowserFile | BrowserBlob | ArrayBuffer | Buffer | string | number | bigint | boolean | object | null | undefined | TypedArray>(
  dataIn: Uint8Array,
  metadataIn: DataMetadata,
  debug?: boolean
): T {
  
    const isBrowser = typeof window !== 'undefined' && typeof File !== 'undefined' && typeof Blob !== 'undefined';
    if (debug) {
    console.log('postProcess input:', {
      dataLength: dataIn.length,
      metadata: metadataIn
    });
  }

  // Handle null type
  if (metadataIn.type === 'null') {
    return null as T;
  }

  // Handle binary data types
  if (metadataIn.type === 'file') {
    if (!isBrowser) {
      // In Node.js, return a Buffer instead of File/Blob
      return Buffer.from(dataIn) as T;
    }
    
    const blob = new Blob([dataIn as unknown as ArrayBuffer], { type: metadataIn.mimeType || 'application/octet-stream' });
    
    // Always create a File if we have a name in metadata
    if (metadataIn.name) {
      return new File([blob], metadataIn.name, { type: blob.type }) as T;
    }
    
    return blob as T;
  }

  if (metadataIn.type === 'buffer') {
    return Buffer.from(dataIn) as T;
  }

  if (metadataIn.type === 'arraybuffer') {
    return dataIn.buffer as T;
  }

  if (metadataIn.type === 'typedarray') {
    const ArrayType = (global as any)[metadataIn.arrayType as keyof typeof global] as new (buffer: ArrayBuffer) => TypedArray;
    if (ArrayType) {
      return new ArrayType(dataIn.buffer as ArrayBuffer) as T;
    }
    throw new Error(`Unsupported TypedArray type: ${metadataIn.arrayType}`);
  }

  // Handle string types
  if (metadataIn.type === 'string') {
    const text = new TextDecoder().decode(dataIn);
    if (metadataIn.subtype === 'base64') {
      // Convert the Uint8Array to base64 string
      const base64String = Buffer.from(dataIn).toString('base64');
      return base64String as T;
    }
    return text as T;
  }

  // Handle number types
  if (metadataIn.type === 'number') {
    const text = new TextDecoder().decode(dataIn);
    if (metadataIn.subtype === 'bigint') {
      return BigInt(text) as T;
    }
    return Number(text) as T;
  }

  // Handle boolean type
  if (metadataIn.type === 'boolean') {
    const text = new TextDecoder().decode(dataIn);
    return (text === 'true') as T;
  }

  // Handle object types
  if (metadataIn.type === 'object') {
    const text = new TextDecoder().decode(dataIn);
    const parsed = JSON.parse(text);
    
    if (metadataIn.subtype === 'map') {
      return new Map(Object.entries(parsed)) as T;
    }
    
    if (metadataIn.subtype === 'set') {
      return new Set(parsed) as T;
    }
    
    return parsed as T;
  }

  throw new Error(`Unsupported metadata type: ${metadataIn.type}`);
} 

export async function encrypt(
  alicePrivateKey: string,
  data: Uint8Array, 
  metadata: DataMetadata,
  registryContractAddress: string,
  validationContractAddress: string,
  bundlerRpcUrl: string
) {
  // Create LitClient
  const litClient = await createLitClient({
      network: nagaDev,
  });

  // Ensure private key has 0x prefix
  const formattedPrivateKey = alicePrivateKey.startsWith('0x') ? alicePrivateKey : `0x${alicePrivateKey}`;
  
  // Alice's account (sender)
  const AliceAccount = privateKeyToAccount(formattedPrivateKey as `0x${string}`);
  console.log('🙋‍♀️ AliceAccount:', AliceAccount.address);

  // Create wallet client for Alice
  const aliceWalletClient = createWalletClient({
      account: AliceAccount,
      chain: baseSepolia,
      transport: http(),
  });

  const kernelVersion = KERNEL_V3_3;
  const kernelAddresses = KernelVersionToAddressesMap[kernelVersion];
  const accountImplementationAddress = kernelAddresses.accountImplementationAddress;
  const authorization = await aliceWalletClient.signAuthorization({
    contractAddress: accountImplementationAddress as `0x${string}`, // Kernel V3.3 implementation address
    account: AliceAccount,
  });

  const kernelClient = await getKernelClient(
    AliceAccount,
    baseSepolia,
    bundlerRpcUrl,
    authorization,
    true,
  );
  
  const dataIdentifier = generateRandomDataIdentifier(data);

  const rawAccs = {
    contractAddress: registryContractAddress,
    functionName: "checkPermission",
    functionParams: [dataIdentifier, ":userAddress"],
    functionAbi: {
      type: "function" as const,
      stateMutability: "view" as const,
      outputs: [
        {
          type: "bool" as const,
          name: "",
          internalType: "bool" as const,
        },
      ],
      name: "checkPermission",
      inputs: [
        {
          type: "string" as const,
          name: "fileIdentifier",
          internalType: "string" as const,
        },
        {
          type: "address" as const,
          name: "requestAddress",
          internalType: "address" as const,
        },
      ],
    },
    chain: "baseSepolia" as const,
    conditionType: "evmContract" as const,
    returnValueTest: {
      key: "",
      comparator: "=" as const,
      value: "true",
    },
  };
  const accs = [rawAccs];

  console.log('🔒 Access control conditions:', accs);

  // Alice encrypts data (no AuthContext needed)
  const encryptedData = await litClient.encrypt({
      dataToEncrypt: data,
      unifiedAccessControlConditions: accs,
      chain: 'baseSepolia',
  });

  // Note: Smart contract operations (deploy permissioned file + mint NFT) 
  // are now handled separately after Filecoin upload

  console.log('✅ Encryption complete!');
  console.log('📋 Data identifier:', dataIdentifier);
  
  // Return the encrypted data and all necessary info for smart contract operations
  const encryptedDataPayload = {
    ciphertext: encryptedData.ciphertext,
    dataToEncryptHash: encryptedData.dataToEncryptHash,
    accessControlConditions: accs,
    metadata: metadata,
    dataIdentifier: dataIdentifier,
    // Include data needed for smart contract operations after Filecoin upload
    smartContractData: {
      kernelClient: kernelClient,
      userAddress: AliceAccount.address,
      registryContractAddress: registryContractAddress,
      validationContractAddress: validationContractAddress,
    }
  };

  console.log('🔒 Complete encrypted payload:', {
    ciphertext: encryptedDataPayload.ciphertext,
    dataToEncryptHash: encryptedDataPayload.dataToEncryptHash,
    metadata: encryptedDataPayload.metadata,
    dataIdentifier: encryptedDataPayload.dataIdentifier
  });

  return encryptedDataPayload;
}

export async function deployPermissionsAndMintNFT(
  dataIdentifier: string,
  metadata: DataMetadata,
  kernelClient: any,
  userAddress: string,
  registryContractAddress: string,
  validationContractAddress: string,
  isPublic: boolean = false
) {
  try {
    // Create custom parameters based on public/private access
    const customParameters: PermissionParameters[] = [{
      permissionType: 0,
      permissionAddress: userAddress,
      tokenQuantity: isPublic ? 0 : 1, // 0 for public (anyone can access), 1 for private (NFT required)
      timeLimitBlockNumber: 0,
      operator: 0,
    }];

    // Deploy the permissioned data
    console.log(`🚀 Deploying ${isPublic ? 'public' : 'private'} permission contract...`);
    await deployPermissionedData(
      dataIdentifier,
      JSON.stringify(metadata),
      kernelClient,
      userAddress,
      registryContractAddress,
      validationContractAddress,
      PermissionsRegistryAbi as any,
      customParameters,
      true
    );
    console.log('✅ Permission contract deployed');

    // Only mint NFT for private files
    if (!isPublic) {
      console.log('🎫 Minting owner NFT...');
      await mintOwnerNFT(
        kernelClient,
        registryContractAddress,
        dataIdentifier,
        PermissionsRegistryAbi as any,
        true
      );
      console.log('✅ Owner NFT minted');
    } else {
      console.log('📢 Public file - no NFT needed (anyone can decrypt)');
    }
  } catch (error) {
    console.error('❌ Smart contract operation failed:', error);
    throw error; // Re-throw so caller can handle appropriately
  }
}

export async function decrypt(userAccount: any, encryptedDataPayload: any) {
    // Create LitClient
    const litClient = await createLitClient({
        network: nagaDev,
    });

    console.log('🙋‍♀️ Decrypting with account:', userAccount.address);

    const accs = encryptedDataPayload.accessControlConditions;

    console.log('🔒 Recreated access control conditions:', accs);

    // Create AuthContext for decryption
    const authManager = createAuthManager({
        storage: storagePlugins.localStorageNode({
        appName: LIT_PROTOCOL.APP_NAME,
        networkName: LIT_PROTOCOL.NETWORK_NAME,
        storagePath: LIT_PROTOCOL.STORAGE_PATH,
        }),
    });
    
    const authContext = await authManager.createEoaAuthContext({
        config: {
        account: userAccount as any,
        },
        authConfig: {
        domain: LIT_PROTOCOL.AUTH_DOMAIN,
        statement: LIT_PROTOCOL.AUTH_STATEMENT,
        expiration: new Date(Date.now() + AUTH_EXPIRATION.DEFAULT_MS).toISOString(),
        resources: [
            ['access-control-condition-decryption', '*'],
            ['lit-action-execution', '*'],
        ],
        },
        litClient,
    });    

    console.log('🔑 Auth context created');

    // Reconstruct encrypted data object for decryption
    const encryptedData = {
        ciphertext: encryptedDataPayload.ciphertext,
        dataToEncryptHash: encryptedDataPayload.dataToEncryptHash,
    };

    // Decrypt the data using recreated access control conditions
    const decryptedResponse = await litClient.decrypt({
        data: encryptedData,
        unifiedAccessControlConditions: accs,
        authContext: authContext,
        chain: 'baseSepolia',
    });

    console.log('🔓 Decrypted response:', decryptedResponse);
    console.log('✅ Decryption successful!');
    
    return {decryptedData: decryptedResponse.decryptedData, metadata: encryptedDataPayload.metadata};
}

export async function share(
  dataIdentifier: string,
  walletClient: Client<Transport, Chain, Account>,
  recipientAddresses: string[],
  permissionsRegistryContractAddress: string,
  bundlerRpcUrl: string,
  authorization: any,
  debug?: boolean
) {

  const kernelClient = await getKernelClient(
      walletClient,
      baseSepolia,
      bundlerRpcUrl,
      authorization,
      debug
  );

  const tx = await kernelClient.sendUserOperation({
      callData: await kernelClient.account.encodeCalls([{
          to: permissionsRegistryContractAddress as `0x${string}`,
          data: encodeFunctionData({
              abi: PermissionsRegistryAbi,
              functionName: "mintFromPermissionedFileForOwner",
              args: [dataIdentifier, recipientAddresses]
          }),
      }]),
  });

  if (debug) {
      console.log("[DEBUG] tx:", tx);
  }

  const { receipt } = await kernelClient.waitForUserOperationReceipt({
      hash: tx,
  });

  if (debug) {
      console.log("[DEBUG] receipt:", receipt);
  }

  return receipt;
}