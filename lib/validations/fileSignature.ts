import "server-only";

export type AllowedFileKind = "image/png" | "image/jpeg" | "image/webp" | "application/pdf";

/**
 * Validates a file's actual content against known magic-byte signatures,
 * rather than trusting the client-supplied MIME type (which is trivially
 * spoofable — e.g. renaming a .exe to receipt.png).
 *
 * Checks only the byte ranges needed to identify each format; does not
 * validate the rest of the file structure.
 */
export async function detectFileKind(file: File): Promise<AllowedFileKind | null> {
  // 12 bytes is enough to identify every signature below (WEBP's is the
  // longest, at bytes 0-3 and 8-11).
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());

  if (matches(header, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }

  if (matches(header, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }

  if (
    matches(header, [0x52, 0x49, 0x46, 0x46]) && // "RIFF"
    matches(header.slice(8, 12), [0x57, 0x45, 0x42, 0x50]) // "WEBP"
  ) {
    return "image/webp";
  }

  if (matches(header, [0x25, 0x50, 0x44, 0x46])) {
    // "%PDF" — the 5th byte is normally "-" but versions vary; 4 bytes is enough.
    return "application/pdf";
  }

  return null;
}

function matches(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((byte, i) => bytes[i] === byte);
}
