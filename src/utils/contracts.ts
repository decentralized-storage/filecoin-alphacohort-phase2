import { type Signer } from "ethers";
import { Contract } from "ethers";

// ABIs are now hardcoded in this file instead of imported from JSON files

// Hardcoded ABI for PermissionedFile
const PermissionedFileAbi = Object.freeze([
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  {
    inputs: [],
    name: "ERC721EnumerableForbiddenBatchMint",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "sender", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
      { internalType: "address", name: "owner", type: "address" },
    ],
    name: "ERC721IncorrectOwner",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "operator", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
    ],
    name: "ERC721InsufficientApproval",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "approver", type: "address" }],
    name: "ERC721InvalidApprover",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "operator", type: "address" }],
    name: "ERC721InvalidOperator",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "ERC721InvalidOwner",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "receiver", type: "address" }],
    name: "ERC721InvalidReceiver",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "sender", type: "address" }],
    name: "ERC721InvalidSender",
    type: "error",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "ERC721NonexistentToken",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "uint256", name: "index", type: "uint256" },
    ],
    name: "ERC721OutOfBoundsIndex",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "OwnableInvalidOwner",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "OwnableUnauthorizedAccount",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "approved",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "operator",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "approved",
        type: "bool",
      },
    ],
    name: "ApprovalForAll",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "enum PermissionType",
            name: "permissionType",
            type: "uint8",
          },
          {
            internalType: "address",
            name: "permissionAddress",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "tokenQuantity",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "timeLimitBlockNumber",
            type: "uint256",
          },
          {
            internalType: "enum PermissionOperator",
            name: "operator",
            type: "uint8",
          },
        ],
        internalType: "struct PermissionParameters[]",
        name: "permissions",
        type: "tuple[]",
      },
    ],
    name: "addNewPermissionParameters",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "allowsPublicDistribution",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
    ],
    name: "approve",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "requestAddress",
        type: "address",
      },
    ],
    name: "checkPermissions",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "clearPermissions",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "deletePermissionedFile",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "distributionFee",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "distributionFeeTokenAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "feeRecipientAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "fileIdentifier",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "filePermissionParameters",
    outputs: [
      {
        internalType: "enum PermissionType",
        name: "permissionType",
        type: "uint8",
      },
      {
        internalType: "address",
        name: "permissionAddress",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "tokenQuantity",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "timeLimitBlockNumber",
        type: "uint256",
      },
      {
        internalType: "enum PermissionOperator",
        name: "operator",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "getApproved",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getPermissionParametersArrayLength",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_permissionValidatorAddress",
        type: "address",
      },
      {
        components: [
          {
            internalType: "enum PermissionType",
            name: "permissionType",
            type: "uint8",
          },
          {
            internalType: "address",
            name: "permissionAddress",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "tokenQuantity",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "timeLimitBlockNumber",
            type: "uint256",
          },
          {
            internalType: "enum PermissionOperator",
            name: "operator",
            type: "uint8",
          },
        ],
        internalType: "struct PermissionParameters[]",
        name: "_filePermissionParameters",
        type: "tuple[]",
      },
      {
        internalType: "string",
        name: "_fileIdentifier",
        type: "string",
      },
      {
        internalType: "address",
        name: "_permissionRegistryAddress",
        type: "address",
      },
      { internalType: "address", name: "owner", type: "address" },
    ],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "operator", type: "address" },
    ],
    name: "isApprovedForAll",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "mintForPublic",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "to", type: "address" }],
    name: "mintToAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address[]", name: "to", type: "address[]" }],
    name: "mintToAddresses",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "permissionRegistryAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "permissionValidatorAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
    ],
    name: "safeTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
      { internalType: "bytes", name: "data", type: "bytes" },
    ],
    name: "safeTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "operator", type: "address" },
      { internalType: "bool", name: "approved", type: "bool" },
    ],
    name: "setApprovalForAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_permissionValidatorAddress",
        type: "address",
      },
    ],
    name: "setPermissionValidatorAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bool",
        name: "_allowsPublicDistribution",
        type: "bool",
      },
      {
        internalType: "uint256",
        name: "_distributionFee",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "_distributionFeeTokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_feeRecipientAddress",
        type: "address",
      },
    ],
    name: "setPublicDistributionParameters",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes4", name: "interfaceId", type: "bytes4" }],
    name: "supportsInterface",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "index", type: "uint256" }],
    name: "tokenByIndex",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "uint256", name: "index", type: "uint256" },
    ],
    name: "tokenOfOwnerByIndex",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
]);

// Hardcoded ABI for PermissionsRegistry
const PermissionsRegistryAbi = Object.freeze([
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "ERC1167FailedCreateClone",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "OwnableInvalidOwner",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "OwnableUnauthorizedAccount",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "fileIdentifier",
        type: "string",
      },
      {
        indexed: false,
        internalType: "address",
        name: "fileAccessMinter",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "fileContractAddress",
        type: "address",
      },
    ],
    name: "PermissionedFileAccessMinted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "fileIdentifier",
        type: "string",
      },
      {
        indexed: false,
        internalType: "address",
        name: "fileOwner",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "fileContractAddress",
        type: "address",
      },
    ],
    name: "PermissionedFileDeleted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "fileIdentifier",
        type: "string",
      },
      {
        indexed: false,
        internalType: "address",
        name: "fileOwner",
        type: "address",
      },
      {
        indexed: false,
        internalType: "string",
        name: "fileMetadata",
        type: "string",
      },
      {
        indexed: false,
        internalType: "address",
        name: "fileContractAddress",
        type: "address",
      },
    ],
    name: "PermissionedFileDeployed",
    type: "event",
  },
  {
    inputs: [],
    name: "allowListAddress",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "allowListContractType",
    outputs: [
      {
        internalType: "enum AllowListContractType",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "allowListId",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "checkAllowList",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "fileIdentifier",
        type: "string",
      },
      {
        internalType: "address",
        name: "requestAddress",
        type: "address",
      },
    ],
    name: "checkPermission",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "fileIdentifier",
        type: "string",
      },
    ],
    name: "deletePermissionedFile",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "fileIdentifier",
        type: "string",
      },
      {
        internalType: "string",
        name: "fileMetadata",
        type: "string",
      },
      {
        internalType: "address",
        name: "permissionValidatorAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "fileSigner",
        type: "address",
      },
      {
        components: [
          {
            internalType: "enum PermissionType",
            name: "permissionType",
            type: "uint8",
          },
          {
            internalType: "address",
            name: "permissionAddress",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "tokenQuantity",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "timeLimitBlockNumber",
            type: "uint256",
          },
          {
            internalType: "enum PermissionOperator",
            name: "operator",
            type: "uint8",
          },
        ],
        internalType: "struct PermissionParameters[]",
        name: "parameters",
        type: "tuple[]",
      },
    ],
    name: "deployPermissionedFile",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "fileContractToFileMetadataIdentifier",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    name: "fileIdentifierToFileContract",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "fileIdentifier",
        type: "string",
      },
      {
        internalType: "address[]",
        name: "to",
        type: "address[]",
      },
    ],
    name: "mintFromPermissionedFileForOwner",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "fileIdentifier",
        type: "string",
      },
    ],
    name: "mintFromPermissionedFileForPublic",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "permissionedFileTemplate",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_allowListAddress",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_allowListId",
        type: "uint256",
      },
      {
        internalType: "enum AllowListContractType",
        name: "_allowListContractType",
        type: "uint8",
      },
    ],
    name: "setAllowListParams",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_permissionedFileTemplate",
        type: "address",
      },
    ],
    name: "setPermissionedFileTemplate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
]);

export class PermissionsRegistry {
  ABI: typeof PermissionsRegistryAbi;
  signer: Signer;
  registryAddress: string;
  contract: Contract;

  constructor(signer: Signer, registryContractAddress: string) {
    this.signer = signer;
    this.registryAddress = registryContractAddress;
    this.ABI = PermissionsRegistryAbi;
    this.contract = new Contract(registryContractAddress, this.ABI, this.signer);
  }

  async checkPermission(fileName: string) {
    try {
      const hasPermission = await this.contract.checkPermission(fileName, await this.signer.getAddress());
      return hasPermission;
    } catch (error) {
      console.error(`Error checking permission for ${fileName}:`, error);
      return false;
    }
  }
}

export class PermissionedFile {
  signer: Signer;
  contract: Contract;
  contractAddress: string;

  constructor(signer: Signer, fileContractAddress: string) {
    this.signer = signer;
    this.contractAddress = fileContractAddress;
    this.contract = new Contract(fileContractAddress, PermissionedFileAbi, this.signer);
  }

  checkFileOwner = async (): Promise<boolean> => {
    let isOwner = false;
    try {
      const ownerAddress = await this.contract.owner();
      const signerAddress = await this.signer.getAddress();
      if (ownerAddress === signerAddress) {
        isOwner = true;
      }
    } catch (error) {
      console.error("Error fetching contract owner:", error);
      return false;
    }
    return isOwner;
  };

  getSmartContracts = async (): Promise<string[]> => {
    const smartContracts: string[] = [];

    try {
      const filePermissionsLength = await this.contract.getPermissionParametersArrayLength();

      if (filePermissionsLength <= 0) {
        console.warn("No permission parameters found.");
        return smartContracts;
      }

      for (let i = 0; i < filePermissionsLength; i++) {
        try {
          const permission = await this.contract.filePermissionParameters(i);
          if (permission.permissionType === 1) {
            smartContracts.push(permission.permissionAddress);
          }
        } catch (err) {
          console.error(`Error fetching permission at index ${i}:`, err);
        }
      }
    } catch (err) {
      console.error("Error interacting with the smart contract:", err);
      throw new Error("Failed to retrieve smart contracts.");
    }

    return smartContracts;
  };

  addWallet = async (destinationAddress: string, debug?: boolean) => {
    const tx = await this.contract.mintToAddress(destinationAddress);
    if (debug) {
      console.log("✅ Transaction Hash:", tx.hash);
    }
    return;
  };

  addSmartContract = async (smartContractAddressToAdd: string, debug?: boolean) => {
    try {
      const parameters = [
        {
          permissionType: 1,
          permissionAddress: smartContractAddressToAdd,
          tokenQuantity: 1,
          timeLimitBlockNumber: 0,
          operator: 1,
        },
      ];

      const tx = await this.contract.addNewPermissionParameters(parameters);
      if (debug) {
        console.log("✅ Transaction Hash:", tx.hash);
      }
      return tx;
    } catch (err) {
      if (err instanceof Error && err.message !== "Invalid smart contract address provided.") {
        console.error("Error adding smart contract:", err);
        throw new Error("Failed to add smart contract.");
      }
      throw err;
    }
  };
}

export { PermissionedFileAbi, PermissionsRegistryAbi };