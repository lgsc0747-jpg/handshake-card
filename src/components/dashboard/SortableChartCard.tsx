import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface SortableChartCardProps {
  id: string;
  children: React.ReactNode;
  editMode?: boolean;
  className?: string;
}

export function SortableChartCard({ id, children, editMode, className }: SortableChartCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className={`relative group ${className ?? ""}`}>
      {editMode && (
        <button
          {...attributes}
          {...listeners}
          className="absolute -top-2 -left-2 z-10 w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity touch-none"
        >
          <GripVertical className="w-3 h-3 text-muted-foreground" />
        </button>
      )}
      {children}
    </div>
  );
}
