import { decodeProofPayload } from "@kagehq/shared";
export function parseScannedPayload(text) {
  return decodeProofPayload(text);
}
