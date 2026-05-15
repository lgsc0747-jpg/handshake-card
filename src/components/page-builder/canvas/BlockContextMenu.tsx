import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger,
  ContextMenuSeparator, ContextMenuShortcut,
} from "@/components/ui/context-menu";
import {
  ChevronUp, ChevronDown, ChevronsUp, ChevronsDown,
  Copy, Clipboard, CopyPlus, Trash2,
} from "lucide-react";

interface Props {
  children: React.ReactNode;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onPaste: () => void;
  canPaste: boolean;
}

export function BlockContextMenu({
  children,
  onBringForward, onSendBackward, onBringToFront, onSendToBack,
  onDuplicate, onDelete, onCopy, onPaste, canPaste,
}: Props) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem onClick={onBringForward}>
          <ChevronUp className="w-3.5 h-3.5 mr-2" /> Bring Forward
          <ContextMenuShortcut>⌘]</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={onSendBackward}>
          <ChevronDown className="w-3.5 h-3.5 mr-2" /> Send Backward
          <ContextMenuShortcut>⌘[</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={onBringToFront}>
          <ChevronsUp className="w-3.5 h-3.5 mr-2" /> Bring to Front
        </ContextMenuItem>
        <ContextMenuItem onClick={onSendToBack}>
          <ChevronsDown className="w-3.5 h-3.5 mr-2" /> Send to Back
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onDuplicate}>
          <CopyPlus className="w-3.5 h-3.5 mr-2" /> Duplicate
          <ContextMenuShortcut>⌘D</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={onCopy}>
          <Copy className="w-3.5 h-3.5 mr-2" /> Copy
          <ContextMenuShortcut>⌘C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={onPaste} disabled={!canPaste}>
          <Clipboard className="w-3.5 h-3.5 mr-2" /> Paste
          <ContextMenuShortcut>⌘V</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
          <ContextMenuShortcut>⌫</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
