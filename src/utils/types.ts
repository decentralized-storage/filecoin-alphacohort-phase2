export interface DataMetadata {
    name: string;           // Human-readable name for the data
    type: string;           // The detected type of the input data
    mimeType?: string;      // The detected MIME type (present for File/Blob inputs)
    subtype?: string;       // Additional type information (e.g., 'bigint', 'base64', 'json')
    arrayType?: string;     // For TypedArrays, specifies the specific array type
    userMetaData?: any;     // Any custom metadata provided during preprocessing
  }
  
  export interface DecryptAPIResponse {
    decryptedData: Uint8Array;
    metadata: DataMetadata;
  }
  
  export interface DecryptConfig {
    registryContractAddress: string;
    chain: string;
    expiration: string;
    apiUrl: string;
  }
  
  export interface DeleteConfig {
    permissionsRegistryContractAddress: string;
    bundlerRpcUrl: string;
  }
  
  export interface EncryptAPIResponse {
    name: string;
    encryptedData: {
      ipfsHash: string;
      dataIdentifier: string;
    }
  }
  
  export interface EncryptConfig {
    apiUrl: string;
    validatorAddress: string;
    registryContractAddress: string;
    bundlerRpcUrl: string;
  }
  
  export interface EncryptForProxyConfig {
    apiUrl: string;
    validatorAddress: string;
    registryContractAddress: string;
    bundlerRpcUrl: string;
    proxyAddress: string;
  }
  
  export interface EncryptionResult {
    dataCID: string,           // IPFS Content Identifier (CID) of the encrypted data
    dataIdentifier: string,    // Unique identifier for the encrypted data
  }
  
  export interface KeypoRefs {
    Version: string;
    KeypoApiUrl: string;
    RegistryContractAddress: string;
    DefaultValidationContractAddress: string;
    DefaultLitActionCID: string;
    DefaultJSONRPC: string;
    ChainId: string;
    Chain: string;
    GetFileDataByOwnerSubGraph: string;
  }
  
  export interface ProxyExecuteConfig {
      chain: string,
      apiUrl: string,
      expiration: string,
      permissionsRegistryContractAddress: string
    }
  
  export interface ShareConfig {
    permissionsRegistryContractAddress: string;
    bundlerRpcUrl: string;
  }
  
  export type TypedArray = 
    | Int8Array 
    | Uint8Array 
    | Uint8ClampedArray 
    | Int16Array 
    | Uint16Array 
    | Int32Array 
    | Uint32Array 
    | Float32Array 
    | Float64Array;
  
  // Conditional types for browser-only APIs
  export type BrowserFile = typeof File extends undefined ? never : File;
  export type BrowserBlob = typeof Blob extends undefined ? never : Blob; 