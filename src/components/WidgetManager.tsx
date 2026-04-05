import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Zap, Users, Smartphone, MapPin, Eye, FileText,
  Settings2, X, GripVertical,
} from "lucide-react";

interface WidgetManagerProps {
  stats: {
    totalTaps: number;
    uniqueVisitors: number;
    contactSaveRate: number;
    avgDwellTime: number;
    topDevice: string;
    topLocation: string;
    profileViews: number;
    cvDownloads: number;
    vcardDownloads: number;
    leadGenCount: number;
  };
}

type WidgetKey = "totalTaps" | "uniqueVisitors" | "contactSaveRate" | "topDevice" | "profileViews" | "vcardDownloads" | "cvDownloads" | "leadGenCount";

const WIDGET_CONFIG: { key: WidgetKey; label: string; icon: React.ReactNode }[] = [
  { key: "totalTaps", label: "Total Taps", icon: <Zap className="w-4 h-4" /> },
  { key: "uniqueVisitors", label: "Unique Visitors", icon: <Users className="w-4 h-4" /> },
  { key: "contactSaveRate", label: "Contact Save Rate", icon: <Eye className="w-4 h-4" /> },
  { key: "topDevice", label: "Top Device", icon: <Smartphone className="w-4 h-4" /> },
  { key: "profileViews", label: "Profile Views", icon: <Eye className="w-4 h-4" /> },
  { key: "vcardDownloads", label: "vCard Saves", icon: <FileText className="w-4 h-4" /> },
  { key: "cvDownloads", label: "CV Downloads", icon: <FileText className="w-4 h-4" /> },
  { key: "leadGenCount", label: "Leads Captured", icon: <Users className="w-4 h-4" /> },
];

const DEFAULT_ORDER: WidgetKey[] = WIDGET_CONFIG.map((w) => w.key);
const DEFAULT_VISIBILITY: Record<WidgetKey, boolean> = {
  totalTaps: true, uniqueVisitors: true, contactSaveRate: true,
  topDevice: true, profileViews: true, vcardDownloads: true, cvDownloads: true, leadGenCount: true,
};

const STORAGE_KEY_ORDER = "nfc_widget_order";
const STORAGE_KEY_VIS = "nfc_widget_visibility";

function loadOrder(): WidgetKey[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ORDER);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_ORDER;
}

function loadVisibility(): Record<WidgetKey, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VIS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_VISIBILITY;
}

function SortableWidget({
  id,
  title,
  value,
  icon,
  editMode,
}: {
  id: string;
  title: string;
  value: string;
  icon: React.ReactNode;
  editMode: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className="relative"
    >
      {editMode && (
        <button
          className="absolute -top-2 -left-2 z-10 w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-3 h-3 text-muted-foreground" />
        </button>
      )}
      <StatCard title={title} value={value} icon={icon} />
    </motion.div>
  );
}

export function WidgetManager({ stats }: WidgetManagerProps) {
  const [editMode, setEditMode] = useState(false);
  const [order, setOrder] = useState<WidgetKey[]>(loadOrder);
  const [visible, setVisible] = useState<Record<WidgetKey, boolean>>(loadVisibility);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ORDER, JSON.stringify(order));
  }, [order]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_VIS, JSON.stringify(visible));
  }, [visible]);

  const getValue = useCallback((key: WidgetKey): string => {
    switch (key) {
      case "totalTaps": return stats.totalTaps.toLocaleString();
      case "uniqueVisitors": return stats.uniqueVisitors.toLocaleString();
      case "topDevice": return stats.topDevice;
      case "topLocation": return stats.topLocation;
      case "profileViews": return stats.profileViews.toLocaleString();
      case "cvDownloads": return stats.cvDownloads.toLocaleString();
    }
  }, [stats]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrder((prev) => {
        const oldIndex = prev.indexOf(active.id as WidgetKey);
        const newIndex = prev.indexOf(over.id as WidgetKey);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const activeWidgets = order
    .filter((key) => visible[key])
    .map((key) => WIDGET_CONFIG.find((w) => w.key === key)!)
    .filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-sm">Metrics</h2>
        <Button
          size="sm"
          variant={editMode ? "default" : "outline"}
          className={editMode ? "gradient-primary text-primary-foreground h-7 text-xs" : "h-7 text-xs"}
          onClick={() => setEditMode(!editMode)}
        >
          {editMode ? <X className="w-3 h-3 mr-1" /> : <Settings2 className="w-3 h-3 mr-1" />}
          {editMode ? "Done" : "Edit"}
        </Button>
      </div>

      <AnimatePresence mode="popLayout">
        {editMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card rounded-lg p-3 space-y-2 overflow-hidden"
          >
            {WIDGET_CONFIG.map((w) => (
              <div key={w.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  {w.icon}
                  <span>{w.label}</span>
                </div>
                <Switch
                  checked={visible[w.key]}
                  onCheckedChange={(checked) =>
                    setVisible((v) => ({ ...v, [w.key]: checked }))
                  }
                />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={activeWidgets.map((w) => w.key)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence mode="popLayout">
              {activeWidgets.map((w) => (
                <SortableWidget
                  key={w.key}
                  id={w.key}
                  title={w.label}
                  value={getValue(w.key)}
                  icon={w.icon}
                  editMode={editMode}
                />
              ))}
            </AnimatePresence>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
