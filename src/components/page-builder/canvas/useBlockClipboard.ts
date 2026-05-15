import { useRef, useCallback } from "react";
import type { PageBlock } from "@/components/page-builder/types";

/** Module-level in-memory clipboard so copy/paste survives unmounts within session. */
let clipboard: PageBlock[] = [];

export function useBlockClipboard() {
  const ref = useRef(clipboard);

  const copy = useCallback((blocks: PageBlock[]) => {
    clipboard = blocks.map((b) => JSON.parse(JSON.stringify(b)));
    ref.current = clipboard;
  }, []);

  const read = useCallback((): PageBlock[] => clipboard, []);

  const hasContent = useCallback(() => clipboard.length > 0, []);

  return { copy, read, hasContent };
}
