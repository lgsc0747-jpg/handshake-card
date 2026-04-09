import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface SortableChartCardProps {
  id: string;
  children: React.ReactNode;
  editMode?: boolean;
  className?: string;
}

export function SortableChartCard({ id, children, className }: SortableChartCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className={`relative group ${className ?? ""}`}>
      <div {...attributes} {...listeners} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab touch-none z-10">
        <GripVertical className="w-3 h-3 text-muted-foreground" />
      </div>
      {children}
    </div>
  );
}
