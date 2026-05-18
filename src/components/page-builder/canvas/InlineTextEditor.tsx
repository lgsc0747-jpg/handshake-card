import { useEffect, useRef } from "react";

interface Props {
  value: string;
  multiline?: boolean;
  autoFocus?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onCommit: (next: string) => void;
  onCancel?: () => void;
}

/**
 * contentEditable surface for canvas-first inline text editing.
 * Click to place caret, drag to select, type to replace.
 * Esc cancels, click-outside or blur commits.
 */
export function InlineTextEditor({ value, multiline, autoFocus = true, className, style, onCommit, onCancel }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const initial = useRef(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.textContent = initial.current;
    if (!autoFocus) return;
    el.focus();
    // Select all on entry
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [autoFocus]);

  const commit = () => {
    const next = ref.current?.innerText ?? "";
    if (next !== initial.current) onCommit(next);
    else onCancel?.();
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      className={className}
      style={{ outline: "none", cursor: "text", ...style }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") {
          e.preventDefault();
          if (ref.current) ref.current.textContent = initial.current;
          onCancel?.();
        }
        if (e.key === "Enter" && !multiline && !e.shiftKey) {
          e.preventDefault();
          commit();
        }
      }}
    />
  );
}
