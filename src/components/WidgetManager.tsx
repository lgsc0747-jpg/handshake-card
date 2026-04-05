import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Zap, Users, Smartphone, Eye, FileText, Settings2, GripVertical, LayoutGrid,
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
    cardFlips: number;
    returnVisitorRate: number;
    interactionDepthRate: number;
  };
}

type WidgetKey = "profileViews" | "uniqueVisitors" | "topDevice" | "vcardDownloads" | "cvDownloads" | "leadGenCount" | "cardFlips" | "returnVisitorRate" | "interactionDepthRate";

const WIDGET_CONFIG: { key: WidgetKey; label: string; icon: React.ReactNode; description: string }[] = [
  { key: "profileViews", label: "Profile Views", icon: <Eye className="w-4 h-4" />, description: "Total landing page views" },
  { key: "uniqueVisitors", label: "Unique Visitors", icon: <Users className="w-4 h-4" />, description: "Distinct visitors by session" },
  { key: "topDevice", label: "Top Device", icon: <Smartphone className="w-4 h-4" />, description: "Most common device type" },
  { key: "vcardDownloads", label: "vCard Saves", icon: <FileText className="w-4 h-4" />, description: "Total contact card downloads" },
  { key: "cvDownloads", label: "CV Downloads", icon: <FileText className="w-4 h-4" />, description: "Total resume downloads" },
  { key: "leadGenCount", label: "Leads Captured", icon: <Users className="w-4 h-4" />, description: "Contacts from private mode" },
  { key: "cardFlips", label: "Card Flips", icon: <Zap className="w-4 h-4" />, description: "Times visitors flipped the card" },
  { key: "returnVisitorRate", label: "Return Visitors", icon: <Users className="w-4 h-4" />, description: "% of returning visitors" },
  { key: "interactionDepthRate", label: "Interaction Depth", icon: <Eye className="w-4 h-4" />, description: "% who interacted beyond viewing" },
];

const DEFAULT_ORDER: WidgetKey[] = WIDGET_CONFIG.map((w) => w.key);
const DEFAULT_VISIBILITY: Record<WidgetKey, boolean> = {
  totalTaps: true, uniqueVisitors: true, contactSaveRate: true,
  topDevice: true, profileViews: true, vcardDownloads: true, cvDownloads: true, leadGenCount: true,
  cardFlips: true, returnVisitorRate: true, interactionDepthRate: true,
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

function SortableWidget({ id, title, value, icon, editMode }: {
  id: string; title: string; value: string; icon: React.ReactNode; editMode: boolean;
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
      ref={setNodeRef} style={style} layout
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }}
      className="relative"
    >
      {editMode && (
        <button
          className="absolute -top-2 -left-2 z-10 w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center cursor-grab active:cursor-grabbing"
          {...attributes} {...listeners}
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

  useEffect(() => { localStorage.setItem(STORAGE_KEY_ORDER, JSON.stringify(order)); }, [order]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_VIS, JSON.stringify(visible)); }, [visible]);

  const getValue = useCallback((key: WidgetKey): string => {
    switch (key) {
      case "totalTaps": return stats.totalTaps.toLocaleString();
      case "uniqueVisitors": return stats.uniqueVisitors.toLocaleString();
      case "contactSaveRate": return `${stats.contactSaveRate}%`;
      case "topDevice": return stats.topDevice;
      case "profileViews": return stats.profileViews.toLocaleString();
      case "vcardDownloads": return stats.vcardDownloads.toLocaleString();
      case "cvDownloads": return stats.cvDownloads.toLocaleString();
      case "leadGenCount": return stats.leadGenCount.toLocaleString();
      case "cardFlips": return stats.cardFlips.toLocaleString();
      case "returnVisitorRate": return `${stats.returnVisitorRate}%`;
      case "interactionDepthRate": return `${stats.interactionDepthRate}%`;
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

  const enabledCount = Object.values(visible).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-sm">Metrics</h2>
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5">
                <LayoutGrid className="w-3 h-3" />
                Widgets ({enabledCount}/{WIDGET_CONFIG.length})
              </Button>
            </SheetTrigger>
            <SheetContent className="w-80">
              <SheetHeader>
                <SheetTitle className="font-display">Widget Library</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-1">
                {WIDGET_CONFIG.map((w) => (
                  <div key={w.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center text-accent-foreground shrink-0">
                        {w.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{w.label}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{w.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={visible[w.key]}
                      onCheckedChange={(checked) => setVisible((v) => ({ ...v, [w.key]: checked }))}
                    />
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
          <Button
            size="sm"
            variant={editMode ? "default" : "outline"}
            className={editMode ? "gradient-primary text-primary-foreground h-7 text-xs" : "h-7 text-xs"}
            onClick={() => setEditMode(!editMode)}
          >
            <Settings2 className="w-3 h-3 mr-1" />
            {editMode ? "Lock" : "Reorder"}
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={activeWidgets.map((w) => w.key)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <AnimatePresence mode="popLayout">
              {activeWidgets.map((w) => (
                <SortableWidget
                  key={w.key} id={w.key} title={w.label}
                  value={getValue(w.key)} icon={w.icon} editMode={editMode}
                />
              ))}
            </AnimatePresence>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
