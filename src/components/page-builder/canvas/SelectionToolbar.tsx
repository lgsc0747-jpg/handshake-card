import {
  AlignLeft, AlignCenter, AlignRight,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter,
  Copy, Trash2,
} from "lucide-react";
import type { AlignOp, DistributeOp } from "./align";

interface Props {
  count: number;
  onAlign: (op: AlignOp) => void;
  onDistribute: (op: DistributeOp) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const Btn = ({ onClick, title, children }: any) => (
  <button
    onClick={onClick}
    title={title}
    className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
  >
    {children}
  </button>
);

export function SelectionToolbar({ count, onAlign, onDistribute, onDuplicate, onDelete }: Props) {
  if (count < 2) return null;
  const canDistribute = count >= 3;
  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-1.5 py-1 rounded-xl bg-card/95 backdrop-blur-md border border-border/60 shadow-2xl pointer-events-auto">
      <span className="text-[10px] font-semibold px-2 text-muted-foreground">{count} selected</span>
      <div className="w-px h-4 bg-border/60" />
      <Btn title="Align left" onClick={() => onAlign("left")}><AlignLeft className="w-3.5 h-3.5" /></Btn>
      <Btn title="Align center" onClick={() => onAlign("center-h")}><AlignCenter className="w-3.5 h-3.5" /></Btn>
      <Btn title="Align right" onClick={() => onAlign("right")}><AlignRight className="w-3.5 h-3.5" /></Btn>
      <div className="w-px h-4 bg-border/60" />
      <Btn title="Align top" onClick={() => onAlign("top")}><AlignStartVertical className="w-3.5 h-3.5" /></Btn>
      <Btn title="Align middle" onClick={() => onAlign("middle-v")}><AlignCenterVertical className="w-3.5 h-3.5" /></Btn>
      <Btn title="Align bottom" onClick={() => onAlign("bottom")}><AlignEndVertical className="w-3.5 h-3.5" /></Btn>
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
