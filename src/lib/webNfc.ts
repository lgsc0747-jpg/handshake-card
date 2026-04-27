// Thin wrapper around the Web NFC API (NDEFReader).
// Only Android Chrome / Edge support this today. iOS and desktops fall back.

export type NfcSupport = "supported" | "unsupported";

export function getNfcSupport(): NfcSupport {
  if (typeof window === "undefined") return "unsupported";
  return "NDEFReader" in window ? "supported" : "unsupported";
}

export interface NfcScanResult {
  serialNumber: string;
}

/**
 * Start a single-tap NFC scan. Resolves with the serial number of the first
 * tag detected, or rejects with a structured error.
 *
 * Pass an AbortSignal to cancel an in-progress scan (e.g. when the user
 * closes the dialog).
 */
export async function readNfcSerial(signal?: AbortSignal): Promise<NfcScanResult> {
  if (getNfcSupport() === "unsupported") {
    throw new Error("nfc_unsupported");
  }

  const NDEFReaderCtor = (window as any).NDEFReader;
  const reader = new NDEFReaderCtor();

  await reader.scan({ signal });

  return new Promise<NfcScanResult>((resolve, reject) => {
    const onReading = (event: any) => {
      const serial = (event?.serialNumber ?? "").toString().trim();
      cleanup();
      if (!serial) {
        reject(new Error("nfc_no_serial"));
      } else {
        resolve({ serialNumber: serial });
      }
    };
    const onError = () => {
      cleanup();
      reject(new Error("nfc_read_error"));
    };
    const onAbort = () => {
      cleanup();
      reject(new Error("nfc_aborted"));
    };

    const cleanup = () => {
      reader.removeEventListener?.("reading", onReading);
      reader.removeEventListener?.("readingerror", onError);
      signal?.removeEventListener("abort", onAbort);
    };

    reader.addEventListener?.("reading", onReading);
    reader.addEventListener?.("readingerror", onError);
    signal?.addEventListener("abort", onAbort);
  });
}
