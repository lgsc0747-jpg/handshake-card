import {
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter,
  AlignHorizontalJustifyCenter,
  Copy, Trash2,
} from "lucide-react";
import type { AlignOp, DistributeOp } from "./align";

export type TextAlign = "left" | "center" | "right" | "justify";

interface Props {
  count: number;
  /** Active text alignment of the (first) selected block, if any text block selected. */
  textAlign?: TextAlign | null;
  hasTextBlock?: boolean;
  onAlign: (op: AlignOp) => void;
  onDistribute: (op: DistributeOp) => void;
  onSetTextAlign?: (a: TextAlign) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const Btn = ({ onClick, title, active, children }: any) => (
  <button
    onClick={onClick}
    title={title}
    className={
      "h-7 w-7 rounded-md flex items-center justify-center transition-all " +
      (active
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/60")
    }
  >
    {children}
  </button>
);

export function SelectionToolbar({
  count, textAlign, hasTextBlock,
  onAlign, onDistribute, onSetTextAlign, onDuplicate, onDelete,
}: Props) {
  if (count < 1) return null;
  const canMultiAlign = count >= 2;
  const canDistribute = count >= 3;
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 px-1.5 py-1 rounded-xl bg-card/95 backdrop-blur-md border border-border/60 shadow-2xl pointer-events-auto">
      <span className="text-[10px] font-semibold px-2 text-muted-foreground">{count} sel</span>

      {hasTextBlock && onSetTextAlign && (
        <>
          <div className="w-px h-4 bg-border/60" />
          <Btn title="Text left" active={textAlign === "left"} onClick={() => onSetTextAlign("left")}>
            <AlignLeft className="w-3.5 h-3.5" />
          </Btn>
          <Btn title="Text center" active={textAlign === "center"} onClick={() => onSetTextAlign("center")}>
            <AlignCenter className="w-3.5 h-3.5" />
          </Btn>
          <Btn title="Text right" active={textAlign === "right"} onClick={() => onSetTextAlign("right")}>
            <AlignRight className="w-3.5 h-3.5" />
          </Btn>
          <Btn title="Text justify" active={textAlign === "justify"} onClick={() => onSetTextAlign("justify")}>
            <AlignJustify className="w-3.5 h-3.5" />
          </Btn>
        </>
      )}

      {canMultiAlign && (
        <>
          <div className="w-px h-4 bg-border/60" />
          <Btn title="Align left" onClick={() => onAlign("left")}><AlignStartVertical className="w-3.5 h-3.5" /></Btn>
          <Btn title="Align center horizontal" onClick={() => onAlign("center-h")}><AlignHorizontalJustifyCenter className="w-3.5 h-3.5" /></Btn>
          <Btn title="Align right" onClick={() => onAlign("right")}><AlignEndVertical className="w-3.5 h-3.5" /></Btn>
          <div className="w-px h-4 bg-border/60" />
          <Btn title="Align top" onClick={() => onAlign("top")}><AlignStartVertical className="w-3.5 h-3.5 rotate-90" /></Btn>
          <Btn title="Align middle" onClick={() => onAlign("middle-v")}><AlignCenterVertical className="w-3.5 h-3.5" /></Btn>
          <Btn title="Align bottom" onClick={() => onAlign("bottom")}><AlignEndVertical className="w-3.5 h-3.5 rotate-90" /></Btn>
        </>
      )}

      {canDistribute && (
        <>
          <div className="w-px h-4 bg-border/60" />
          <Btn title="Distribute horizontally" onClick={() => onDistribute("horizontal")}>
            <AlignHorizontalDistributeCenter className="w-3.5 h-3.5" />
          </Btn>
          <Btn title="Distribute vertically" onClick={() => onDistribute("vertical")}>
            <AlignVerticalDistributeCenter className="w-3.5 h-3.5" />
          </Btn>
        </>
      )}

      <div className="w-px h-4 bg-border/60" />
      <Btn title="Duplicate" onClick={onDuplicate}><Copy className="w-3.5 h-3.5" /></Btn>
      <Btn title="Delete" onClick={onDelete}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Btn>
    </div>
  );
}
