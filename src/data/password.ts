import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
export async function derivePassword(password: string, salt: string) {
  return bytesToHex(
    await pbkdf2Async(sha256, password, salt, {
      c: 600000,
      dkLen: 32,
      asyncTick: 16,
    }),
  );
}
