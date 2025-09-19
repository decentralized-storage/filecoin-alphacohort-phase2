import { createHash } from "crypto";

export const hashData = (data: Uint8Array) => {
  return createHash('sha256').update(Buffer.from(data)).digest('hex');
};