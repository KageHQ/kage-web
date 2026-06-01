import { decodeProofPayload } from "@proven-kyc/shared";
export function parseScannedPayload(text) {
  return decodeProofPayload(text);
}
