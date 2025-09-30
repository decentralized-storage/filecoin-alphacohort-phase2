/**
 * Application constants and magic numbers
 * All hardcoded values should be centralized here for better maintainability
 */

// ============================================================================
// FILE SIZE & STORAGE CONSTANTS
// ============================================================================

export const FILE_SIZE = {
  /** Bytes per kilobyte */
  BYTES_PER_KB: 1024,
  /** Bytes per megabyte */
  BYTES_PER_MB: 1024 * 1024,
  /** Bytes per gigabyte */
  BYTES_PER_GB: 1024 * 1024 * 1024,
} as const;

export const STORAGE_DEFAULTS = {
  /** Default storage capacity in GB */
  CAPACITY_GB: 10,
  /** Default persistence period in days */
  PERSISTENCE_DAYS: 30,
  /** Minimum days threshold */
  MIN_DAYS_THRESHOLD: 10,
  /** Default CDN enabled state */
  WITH_CDN: true,
} as const;

// ============================================================================
// TOKEN & PAYMENT CONSTANTS
// ============================================================================

export const TOKEN_DECIMALS = {
  /** USDFC token decimal places */
  USDFC: 6,
  /** FIL token decimal places */
  FIL: 18,
} as const;

export const TOKEN_AMOUNTS = {
  /** Minimum allowance threshold (1 USDFC in smallest units) */
  MIN_ALLOWANCE: 1000000n,
  /** Minimum Synapse balance threshold (0.1 USDFC in smallest units) */
  MIN_SYNAPSE_BALANCE: 100000n,
  /** Default deposit amount (1 USDFC in smallest units) */
  DEFAULT_DEPOSIT: 1000000n,
  /** Minimum wallet balance threshold for warnings (in formatted units) */
  MIN_WALLET_BALANCE: 0.1,
  /** Minimum balance required for uploads (in formatted units) */
  UPLOAD_MIN_BALANCE: 1,
  /** Rate calculation divisor for storage pricing */
  RATE_DIVISOR: 1000n,
  /** Dataset creation fee (0.1 USDFC in wei) */
  DATA_SET_CREATION_FEE: BigInt(0.1 * 10 ** 18),
} as const;

export const BALANCE_THRESHOLDS = {
  /** Low balance warning threshold (formatted USDFC) */
  LOW_BALANCE_WARNING: 0.1,
  /** Minimum balance for deposit suggestions (formatted USDFC) */
  DEPOSIT_SUGGESTION_MIN: 1,
  /** Minimum balance required for uploads (formatted USDFC) */
  UPLOAD_MIN_BALANCE: 1,
} as const;

// ============================================================================
// NETWORK & CHAIN CONSTANTS
// ============================================================================

export const CHAIN_IDS = {
  /** Filecoin Calibration testnet chain ID */
  CALIBRATION: 314159,
  /** Filecoin mainnet chain ID (for reference) */
  MAINNET: 314,
} as const;

export const NETWORK_NAMES = {
  CALIBRATION: 'calibration' as const,
  MAINNET: 'mainnet' as const,
} as const;

// ============================================================================
// TIME CONSTANTS
// ============================================================================

export const TIME = {
  /** Milliseconds in one second */
  SECOND_MS: 1000,
  /** Milliseconds in one minute */
  MINUTE_MS: 60 * 1000,
  /** Milliseconds in one hour */
  HOUR_MS: 60 * 60 * 1000,
  /** Milliseconds in one day */
  DAY_MS: 24 * 60 * 60 * 1000,
  /** Timestamp conversion factor (seconds to milliseconds) */
  TIMESTAMP_TO_MS: 1000,
} as const;

export const AUTH_EXPIRATION = {
  /** Default auth expiration time (24 hours in milliseconds) */
  DEFAULT_MS: TIME.DAY_MS,
} as const;

// ============================================================================
// RETRY & TIMEOUT CONSTANTS
// ============================================================================

export const RETRY_CONFIG = {
  /** Default number of retry attempts for smart contract operations */
  DEFAULT_ATTEMPTS: 10,
  /** Base retry delay in milliseconds */
  BASE_DELAY_MS: 1000,
  /** Maximum retry delay in milliseconds */
  MAX_DELAY_MS: 5000,
  /** Exponential backoff multiplier */
  BACKOFF_MULTIPLIER: 2,
} as const;

export const TIMEOUT_CONFIG = {
  /** Default operation timeout in milliseconds */
  DEFAULT_MS: 30000,
  /** User operation timeout in milliseconds */
  USER_OPERATION_MS: 60000,
  /** Network request timeout in milliseconds */
  NETWORK_REQUEST_MS: 15000,
} as const;

// ============================================================================
// ERROR EXIT CODES
// ============================================================================

export const EXIT_CODES = {
  /** Successful execution */
  SUCCESS: 0,
  /** General error */
  ERROR: 1,
  /** Configuration error */
  CONFIG_ERROR: 2,
  /** Network error */
  NETWORK_ERROR: 3,
  /** File error */
  FILE_ERROR: 4,
  /** Permission error */
  PERMISSION_ERROR: 5,
  /** Validation error */
  VALIDATION_ERROR: 6,
  /** Encryption error */
  ENCRYPTION_ERROR: 7,
  /** Smart contract error */
  CONTRACT_ERROR: 8,
  /** Payment error */
  PAYMENT_ERROR: 9,
} as const;

// ============================================================================
// LIT PROTOCOL CONSTANTS
// ============================================================================

export const LIT_PROTOCOL = {
  /** Auth manager app name */
  APP_NAME: 'synapse-cli',
  /** Network name for Lit Protocol */
  NETWORK_NAME: 'naga-local',
  /** Storage path for auth context */
  STORAGE_PATH: './lit-auth-local',
  /** Auth domain */
  AUTH_DOMAIN: 'localhost',
  /** Auth statement */
  AUTH_STATEMENT: 'Decrypt test data',
} as const;

// ============================================================================
// FORMATTING CONSTANTS
// ============================================================================

export const FORMATTING = {
  /** Decimal places for file size display */
  FILE_SIZE_DECIMALS: 2,
  /** Decimal places for time display */
  TIME_DECIMALS: 2,
  /** Decimal places for balance display */
  BALANCE_DECIMALS: 2,
} as const;

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

export const VALIDATION = {
  /** Valid network values */
  VALID_NETWORKS: ['mainnet', 'calibration'] as const,
  /** Maximum file size for upload warnings (in bytes) */
  MAX_FILE_SIZE_WARNING: 100 * FILE_SIZE.BYTES_PER_MB, // 100MB
} as const;

// ============================================================================
// UTILITY FUNCTIONS FOR CONVERSIONS
// ============================================================================

/**
 * Convert bytes to megabytes with proper decimals
 */
export const bytesToMB = (bytes: number): string => {
  return (bytes / FILE_SIZE.BYTES_PER_MB).toFixed(FORMATTING.FILE_SIZE_DECIMALS);
};

/**
 * Convert USDFC smallest units to formatted units
 */
export const formatUSDFC = (amount: bigint | number): number => {
  const numAmount = typeof amount === 'bigint' ? Number(amount) : amount;
  return numAmount / Math.pow(10, TOKEN_DECIMALS.USDFC);
};

/**
 * Convert formatted USDFC to smallest units
 */
export const parseUSDFC = (amount: string | number): bigint => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return BigInt(Math.floor(numAmount * Math.pow(10, TOKEN_DECIMALS.USDFC)));
};

/**
 * Convert timestamp to milliseconds for Date constructor
 */
export const timestampToMs = (timestamp: number): number => {
  return timestamp * TIME.TIMESTAMP_TO_MS;
};

/**
 * Calculate exponential backoff delay
 */
export const calculateBackoffDelay = (attempt: number, baseDelay: number = RETRY_CONFIG.BASE_DELAY_MS): number => {
  const delay = baseDelay * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt - 1);
  return Math.min(delay, RETRY_CONFIG.MAX_DELAY_MS);
};

/**
 * Convert storage capacity from GB to bytes
 */
export const storageCapacityToBytes = (capacityGB: number): bigint => {
  return BigInt(capacityGB) * BigInt(FILE_SIZE.BYTES_PER_GB);
};