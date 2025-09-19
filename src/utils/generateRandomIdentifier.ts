import { randomBytes } from "crypto";
import { hashData } from "./hashData.js";

export const generateRandomDataIdentifier = (data: Uint8Array): string => {
    // Hash the data first
    const dataHash = hashData(data);
    // Generate 16 random bytes and convert to hex
    const randomComponent = randomBytes(16).toString('hex');
    // Get current timestamp in milliseconds
    const timestamp = Date.now().toString();
    // Combine data hash, random bytes, and timestamp
    return hashData(Buffer.from(dataHash + randomComponent + timestamp));
  }