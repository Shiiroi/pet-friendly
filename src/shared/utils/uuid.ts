/**
 * Generates a RFC4122 version 4 compliant UUID.
 * Uses the Web Crypto API if available (secure context), with a math-random fallback
 * for non-secure origins (like accessing over local network IP in development).
 */
export function uuidv4(): string {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  
  // Math-based fallback for HTTP local network testing
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
