import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BlockRenderer } from "@/components/page-builder/BlockRenderer";
import { BlockEditor } from "@/components/page-builder/BlockEditor";
import { BLOCK_TYPES, type SitePage, type PageBlock, type BlockTypeId } from "@/components/page-builder/types";
import { PAGE_TEMPLATES, type PageTemplate } from "@/components/page-builder/PageTemplates";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Loader2, Plus, Save, Monitor, Smartphone, Eye, FileText,
  GripVertical, ChevronLeft, ChevronRight, Trash2, Copy, EyeOff,
  Type, AlignLeft, Image, LayoutGrid, Play, Minus, SeparatorHorizontal,
  MousePointerClick, Quote, Users, BarChart3, MessageSquareQuote,
  HelpCircle, Grid3x3, CreditCard, Mail, Share2, Code,
  Home, PanelLeftClose, PanelLeft, FilePlus, Undo2, Redo2, BookTemplate,
  CheckSquare, Square, ArrowLeft, Wifi, Paintbrush, Check, Crown,
} from "lucide-react";
import { PageThemeProvider, usePageTheme, PAGE_THEMES, getPageThemeStyles, PAGE_THEME_CLASS } from "@/contexts/PageBuilderThemeContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const ICON_MAP: Record<string, any> = {
  Type, AlignLeft, Image, LayoutGrid, Play, Minus, SeparatorHorizontal,
  MousePointerClick, Quote, Users, BarChart3, MessageSquareQuote,
  HelpCircle, Grid3x3, CreditCard, Mail, Share2, Code,
};

function SortableBlockItem({ block, Icon, meta, isActive, onSelect, onDuplicate, onDelete }: {
  block: PageBlock;
  Icon: any;
  meta: (typeof BLOCK_TYPES)[number] | undefined;
  isActive: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-all",
        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50",
        !block.is_visible && "opacity-40"
      )}
    >
      <div {...attributes} {...listeners} className="touch-none">
        <GripVertical className="w-3 h-3 cursor-grab shrink-0" />
      </div>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate flex-1">{meta?.label ?? block.block_type}</span>
      <div className="flex gap-0.5">
        <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="p-0.5 hover:text-primary" title="Duplicate">
          <Copy className="w-3 h-3" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-0.5 hover:text-destructive" title="Delete">
          <Trash2 className="w-3 h-3" />
        </button>
        {!block.is_visible && <EyeOff className="w-3 h-3" />}
      </div>
    </div>
  );
}

function SortablePageTab({ page, isActive, onSelect, onRename, onDelete, canDelete }: {
  page: SitePage;
  isActive: boolean;
  onSelect: () => void;
  onRename: (newTitle: string) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(page.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  useEffect(() => { setTitle(page.title); }, [page.title]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commitRename = () => {
    setEditing(false);
    if (title.trim() && title.trim() !== page.title) onRename(title.trim());
    else setTitle(page.title);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border group/tab",
        isActive
          ? "bg-primary/10 text-primary border-primary/30"
          : "text-muted-foreground border-border/40 hover:border-primary/20"
      )}
    >
      <div {...attributes} {...listeners} className="touch-none cursor-grab">
        <GripVertical className="w-3 h-3" />
      </div>
      {editing ? (
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") { setTitle(page.title); setEditing(false); } }}
          className="bg-transparent border-b border-primary/40 outline-none w-20 text-xs"
        />
      ) : (
        <button
          onClick={onSelect}
          onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
          className="flex items-center gap-1"
        >
          {page.is_homepage && <Home className="w-3 h-3" />}
          {page.title}
        </button>
      )}
      {canDelete && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="opacity-0 group-hover/tab:opacity-100 transition-opacity hover:text-destructive" title="Delete page">
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

function SortablePreviewBlock({ block, editingBlockId, onSelect }: {
  block: PageBlock;
  editingBlockId: string | null;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
    position: "relative",
  };
  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-card/80 backdrop-blur-sm rounded-lg p-1 cursor-grab touch-none"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      <BlockRenderer
        block={block}
        isEditing={true}
        onClick={onSelect}
      />
    </div>
  );
}

function PageBuilderPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const pageThemeCtx = usePageTheme();
  const isMobile = useIsMobile();
  const { isPro, loading: subLoading } = useSubscription();
  const [personas, setPersonas] = useState<{ id: string; label: string; slug: string }[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [pages, setPages] = useState<SitePage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [addBlockOpen, setAddBlockOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);

  // Confirmation dialogs
  const [confirmDeleteBlock, setConfirmDeleteBlock] = useState<string | null>(null);
  const [confirmDeletePage, setConfirmDeletePage] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  // Bulk selection
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());

  const toggleBulkSelect = (id: string) => {
    setSelectedBlockIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Undo/Redo history
  const historyRef = useRef<PageBlock[][]>([]);
  const historyIdxRef = useRef(-1);
  const skipHistoryRef = useRef(false);

  const pushHistory = useCallback((newBlocks: PageBlock[]) => {
    if (skipHistoryRef.current) { skipHistoryRef.current = false; return; }
    const idx = historyIdxRef.current;
    historyRef.current = historyRef.current.slice(0, idx + 1);
    historyRef.current.push(JSON.parse(JSON.stringify(newBlocks)));
    historyIdxRef.current = historyRef.current.length - 1;
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
      historyIdxRef.current--;
    }
  }, []);

  const undo = useCallback(() => {
    if (historyIdxRef.current <= 0) return;
    historyIdxRef.current--;
    skipHistoryRef.current = true;
    setBlocks(JSON.parse(JSON.stringify(historyRef.current[historyIdxRef.current])));
  }, []);

  const redo = useCallback(() => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current++;
    skipHistoryRef.current = true;
    setBlocks(JSON.parse(JSON.stringify(historyRef.current[historyIdxRef.current])));
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  useEffect(() => {
    if (!user) return;
    supabase.from("personas").select("id, label, slug").eq("user_id", user.id).order("created_at").then(({ data }) => {
      const list = data ?? [];
      setPersonas(list);
      if (list.length > 0) {
        setSelectedPersonaId(list[0].id);
        pageThemeCtx.setPersonaId(list[0].id);
      }
      setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    if (!user || !selectedPersonaId) return;
    loadPages();
  }, [user, selectedPersonaId]);

  const loadPages = async () => {
    const { data } = await supabase
      .from("site_pages").select("*")
      .eq("persona_id", selectedPersonaId!)
      .eq("user_id", user!.id)
      .order("sort_order");
    if (data && data.length > 0) {
      setPages(data as SitePage[]);
      if (!selectedPageId || !data.find(p => p.id === selectedPageId)) setSelectedPageId(data[0].id);
    } else {
      const { data: newPage } = await supabase.from("site_pages").insert({
        persona_id: selectedPersonaId!, user_id: user!.id,
        title: "Home", slug: "home", is_homepage: true, sort_order: 0,
      }).select().single();
      if (newPage) {
        setPages([newPage as SitePage]);
        setSelectedPageId(newPage.id);
        await supabase.from("page_blocks").insert([
          { block_type: "heading", content: { text: "Welcome", subtitle: "Your personal page", fontSize: 36 }, styles: { alignment: "center", paddingY: 40 }, sort_order: 0, page_id: newPage.id, user_id: user!.id },
          { block_type: "nfc_card", content: {}, styles: { alignment: "center", paddingY: 32 }, sort_order: 1, page_id: newPage.id, user_id: user!.id },
          { block_type: "contact", content: { title: "Get in Touch", buttonText: "Send" }, styles: { maxWidth: "640px" }, sort_order: 2, page_id: newPage.id, user_id: user!.id },
        ]);
      }
    }
  };

  useEffect(() => {
    if (!selectedPageId || !user) return;
    loadBlocks();
  }, [selectedPageId, user]);

  const loadBlocks = async () => {
    const { data } = await supabase.from("page_blocks").select("*")
      .eq("page_id", selectedPageId!).eq("user_id", user!.id).order("sort_order");
    const loaded = (data as PageBlock[]) ?? [];
    setBlocks(loaded);
    historyRef.current = [JSON.parse(JSON.stringify(loaded))];
    historyIdxRef.current = 0;
  };

  const addPage = async () => {
    if (!user || !selectedPersonaId) return;
    const title = `Page ${pages.length + 1}`;
    const { data } = await supabase.from("site_pages").insert({
      persona_id: selectedPersonaId, user_id: user.id,
      title, slug: title.toLowerCase().replace(/\s+/g, "-"), sort_order: pages.length,
    }).select().single();
    if (data) { setPages([...pages, data as SitePage]); setSelectedPageId(data.id); }
  };

  const deletePage = async (id: string) => {
    if (pages.length <= 1) { toast({ title: "Can't delete last page" }); return; }
    await supabase.from("page_blocks").delete().eq("page_id", id);
    await supabase.from("site_pages").delete().eq("id", id);
    const remaining = pages.filter(p => p.id !== id);
    setPages(remaining);
    if (selectedPageId === id) setSelectedPageId(remaining[0]?.id ?? null);
    setConfirmDeletePage(null);
  };

  const updatePageTitle = async (id: string, title: string) => {
    await supabase.from("site_pages").update({ title, slug: title.toLowerCase().replace(/\s+/g, "-") }).eq("id", id);
    setPages(pages.map(p => p.id === id ? { ...p, title, slug: title.toLowerCase().replace(/\s+/g, "-") } : p));
  };

  const addBlock = async (type: BlockTypeId) => {
    if (!user || !selectedPageId) return;
    const { data } = await supabase.from("page_blocks").insert({
      page_id: selectedPageId, user_id: user.id, block_type: type,
      content: {}, styles: {}, sort_order: blocks.length,
    }).select().single();
    if (data) {
      const newBlocks = [...blocks, data as PageBlock];
      setBlocks(newBlocks); pushHistory(newBlocks);
      setEditingBlockId(data.id); setAddBlockOpen(false);
    }
  };

  const updateBlock = (updated: PageBlock) => {
    const newBlocks = blocks.map(b => b.id === updated.id ? updated : b);
    setBlocks(newBlocks); pushHistory(newBlocks);
  };

  const deleteBlock = async (id: string) => {
    await supabase.from("page_blocks").delete().eq("id", id);
    const newBlocks = blocks.filter(b => b.id !== id);
    setBlocks(newBlocks); pushHistory(newBlocks);
    setEditingBlockId(null); setConfirmDeleteBlock(null);
  };

  const bulkDeleteBlocks = async () => {
    if (selectedBlockIds.size === 0) return;
    for (const id of selectedBlockIds) await supabase.from("page_blocks").delete().eq("id", id);
    const newBlocks = blocks.filter(b => !selectedBlockIds.has(b.id));
    setBlocks(newBlocks); pushHistory(newBlocks);
    if (editingBlockId && selectedBlockIds.has(editingBlockId)) setEditingBlockId(null);
    toast({ title: `${selectedBlockIds.size} block(s) deleted` });
    setSelectedBlockIds(new Set()); setBulkMode(false); setConfirmBulkDelete(false);
  };

  const bulkToggleVisibility = (visible: boolean) => {
    const newBlocks = blocks.map(b => selectedBlockIds.has(b.id) ? { ...b, is_visible: visible } : b);
    setBlocks(newBlocks); pushHistory(newBlocks);
  };

  const duplicateBlock = async (block: PageBlock) => {
    if (!user) return;
    const { data } = await supabase.from("page_blocks").insert({
      page_id: block.page_id, user_id: user.id, block_type: block.block_type,
      content: block.content, styles: block.styles, sort_order: block.sort_order + 1,
    }).select().single();
    if (data) {
      const idx = blocks.findIndex(b => b.id === block.id);
      const updated = [...blocks];
      updated.splice(idx + 1, 0, data as PageBlock);
      setBlocks(updated);
    }
  };

  const saveAll = async () => {
    setSaving(true);
    for (const block of blocks) {
      await supabase.from("page_blocks")
        .update({ content: block.content as any, styles: block.styles as any, sort_order: block.sort_order, is_visible: block.is_visible })
        .eq("id", block.id);
    }
    setSaving(false);
    toast({ title: "All changes saved!" });
  };

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } });
  const sensors = useSensors(pointerSensor, touchSensor);

  const handleSortEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = blocks.findIndex(b => b.id === active.id);
    const newIdx = blocks.findIndex(b => b.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const updated = arrayMove([...blocks], oldIdx, newIdx);
    updated.forEach((b, i) => b.sort_order = i);
    setBlocks(updated); pushHistory(updated);
  };

  const handlePageSortEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = pages.findIndex(p => p.id === active.id);
    const newIdx = pages.findIndex(p => p.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const updated = arrayMove([...pages], oldIdx, newIdx);
    updated.forEach((p, i) => p.sort_order = i);
    setPages(updated);
    for (const p of updated) await supabase.from("site_pages").update({ sort_order: p.sort_order }).eq("id", p.id);
  };

  const addFromTemplate = async (template: PageTemplate) => {
    if (!user || !selectedPersonaId) return;
    const { data: newPage } = await supabase.from("site_pages").insert({
      persona_id: selectedPersonaId, user_id: user.id,
      title: template.pageTitle, slug: template.pageSlug,
      sort_order: pages.length, page_icon: template.icon,
    }).select().single();
    if (newPage) {
      await supabase.from("page_blocks").insert(
        template.blocks.map((b, i) => ({
          page_id: newPage.id, user_id: user!.id,
          block_type: b.block_type, content: b.content, styles: b.styles, sort_order: i,
        }))
      );
      setPages([...pages, newPage as SitePage]);
      setSelectedPageId(newPage.id);
      setTemplateOpen(false);
      toast({ title: `"${template.pageTitle}" page created!` });
    }
  };

  const editingBlock = blocks.find(b => b.id === editingBlockId) ?? null;
  const selectedPage = pages.find(p => p.id === selectedPageId);
  

  if (loading || subLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
        <div className="text-center space-y-4 max-w-sm px-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto">
            <Crown className="w-6 h-6 text-amber-500" />
          </div>
          <h2 className="text-xl font-display font-bold">Page Builder — Pro Only</h2>
          <p className="text-sm text-muted-foreground">
            The Page Builder is available exclusively on the Handshake+ plan. Upgrade to create fully customizable multi-page landing sites.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
            </Button>
            <Button onClick={() => navigate("/plans")} className="bg-amber-500 hover:bg-amber-600 text-white">
              <Crown className="w-4 h-4 mr-2" /> Upgrade
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (personas.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
        <div className="text-center space-y-4">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">
            Create a persona in the <Link to="/personas" className="text-primary underline">Persona Vault</Link> first.
          </p>
          <Button variant="outline" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background z-50">
      {/* ═══ Top Toolbar ═══ */}
      <header className="h-12 flex items-center gap-2 px-3 border-b border-border bg-card/80 backdrop-blur-sm shrink-0">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate("/")} title="Back to Dashboard">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="w-px h-5 bg-border" />
        <div className="flex items-center gap-1.5">
          <Wifi className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-display font-bold hidden sm:inline">Page Builder</span>
        </div>
        <Select value={selectedPersonaId ?? ""} onValueChange={(v) => { setSelectedPersonaId(v); pageThemeCtx.setPersonaId(v); }}>
          <SelectTrigger className="w-28 sm:w-36 rounded-lg h-7 text-xs">
            <SelectValue placeholder="Persona" />
          </SelectTrigger>
          <SelectContent>
            {personas.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {/* Page tabs - center */}
        <div className="hidden md:flex items-center gap-1 overflow-x-auto max-w-[40%]">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePageSortEnd}>
            <SortableContext items={pages.map(p => p.id)} strategy={verticalListSortingStrategy}>
              <div className="flex items-center gap-1">
                {pages.map(page => (
                  <SortablePageTab
                    key={page.id}
                    page={page}
                    isActive={selectedPageId === page.id}
                    onSelect={() => setSelectedPageId(page.id)}
                    onRename={(t) => updatePageTitle(page.id, t)}
                    onDelete={() => setConfirmDeletePage(page.id)}
                    canDelete={pages.length > 1}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={addPage} title="Add page">
            <FilePlus className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setTemplateOpen(true)} title="Templates">
            <BookTemplate className="w-3 h-3" />
          </Button>
        </div>

        <div className="flex-1" />

        {/* Right controls */}
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={undo} title="Undo">
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={redo} title="Redo">
            <Redo2 className="w-3.5 h-3.5" />
          </Button>
          <PBThemeSwitcher />
          <div className="w-px h-5 bg-border mx-1 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
            <Button size="sm" variant={deviceMode === "desktop" ? "default" : "ghost"} className="h-6 w-6 p-0" onClick={() => setDeviceMode("desktop")}>
              <Monitor className="w-3 h-3" />
            </Button>
            <Button size="sm" variant={deviceMode === "mobile" ? "default" : "ghost"} className="h-6 w-6 p-0" onClick={() => setDeviceMode("mobile")}>
              <Smartphone className="w-3 h-3" />
            </Button>
          </div>
          <Button onClick={saveAll} disabled={saving} size="sm" className="gradient-primary text-primary-foreground rounded-lg h-7 text-xs px-3">
            {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
            Save
          </Button>
        </div>
      </header>

      {/* Mobile page tabs */}
      <div className="md:hidden flex items-center gap-1 px-2 py-1.5 border-b border-border/40 overflow-x-auto bg-card/50 shrink-0">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePageSortEnd}>
          <SortableContext items={pages.map(p => p.id)} strategy={verticalListSortingStrategy}>
            {pages.map(page => (
              <SortablePageTab
                key={page.id}
                page={page}
                isActive={selectedPageId === page.id}
                onSelect={() => setSelectedPageId(page.id)}
                onRename={(t) => updatePageTitle(page.id, t)}
                onDelete={() => setConfirmDeletePage(page.id)}
                canDelete={pages.length > 1}
              />
            ))}
          </SortableContext>
        </DndContext>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] shrink-0" onClick={addPage}>
          <FilePlus className="w-3 h-3 mr-1" /> Add
        </Button>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] shrink-0" onClick={() => setTemplateOpen(true)}>
          <BookTemplate className="w-3 h-3" />
        </Button>
      </div>

      {/* ═══ Main Area ═══ */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar — Block list */}
        {sidebarOpen && !isMobile && (
          <div className="w-56 shrink-0 border-r border-border/40 bg-card/30 flex flex-col overflow-hidden">
            <div className="p-2 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Input
                  value={selectedPage?.title ?? ""}
                  onChange={(e) => selectedPage && updatePageTitle(selectedPage.id, e.target.value)}
                  className="h-6 text-[11px] font-semibold"
                />
                {pages.length > 1 && (
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive shrink-0" onClick={() => selectedPage && setConfirmDeletePage(selectedPage.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                <div className="flex items-center justify-between px-1 py-1">
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">Blocks</p>
                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="sm" className="h-5 px-1 text-[9px]" onClick={() => { setBulkMode(!bulkMode); setSelectedBlockIds(new Set()); }}>
                      {bulkMode ? "Cancel" : "Select"}
                    </Button>
                    {bulkMode && selectedBlockIds.size > 0 && (
                      <>
                        <Button variant="ghost" size="sm" className="h-5 px-1 text-[9px]" onClick={() => bulkToggleVisibility(true)} title="Show">
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-5 px-1 text-[9px]" onClick={() => bulkToggleVisibility(false)} title="Hide">
                          <EyeOff className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-5 px-1 text-[9px] text-destructive" onClick={() => setConfirmBulkDelete(true)} title="Delete">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSortEnd}>
                  <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                    {blocks.map((block) => {
                      const meta = BLOCK_TYPES.find(b => b.id === block.block_type);
                      const Icon = meta ? ICON_MAP[meta.icon] ?? FileText : FileText;
                      return (
                        <div key={block.id} className="flex items-center gap-1">
                          {bulkMode && (
                            <Checkbox
                              checked={selectedBlockIds.has(block.id)}
                              onCheckedChange={() => toggleBulkSelect(block.id)}
                              className="w-3 h-3"
                            />
                          )}
                          <div className="flex-1">
                            <SortableBlockItem
                              block={block} Icon={Icon} meta={meta}
                              isActive={editingBlockId === block.id}
                              onSelect={() => bulkMode ? toggleBulkSelect(block.id) : setEditingBlockId(block.id)}
                              onDuplicate={() => duplicateBlock(block)}
                              onDelete={() => setConfirmDeleteBlock(block.id)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </SortableContext>
                </DndContext>
              </div>
            </ScrollArea>

            <div className="p-2 border-t border-border/40">
              <Button variant="outline" size="sm" className="w-full text-[10px] h-7 rounded-lg" onClick={() => setAddBlockOpen(true)}>
                <Plus className="w-3 h-3 mr-1" /> Add Block
              </Button>
            </div>
          </div>
        )}

        {/* Toggle sidebar */}
        {!isMobile && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center justify-center w-5 bg-card/30 hover:bg-muted/50 border-r border-border/40 transition-colors shrink-0"
          >
            {sidebarOpen ? <PanelLeftClose className="w-3 h-3 text-muted-foreground" /> : <PanelLeft className="w-3 h-3 text-muted-foreground" />}
          </button>
        )}

        {/* ═══ Center Canvas ═══ */}
        <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">
          <ScrollArea className="flex-1">
            <div className="flex justify-center p-4 md:p-8 min-h-full">
              <div
                className={cn(
                  "relative transition-all duration-300 shadow-lg flex flex-col",
                  PAGE_THEME_CLASS,
                  deviceMode === "mobile"
                    ? "w-[375px] min-h-[667px] border-[6px] border-muted-foreground/15 rounded-[2.5rem]"
                    : "w-full max-w-5xl min-h-[calc(100vh-8rem)] rounded-xl border border-border/60"
                )}
                style={{
                  ...getPageThemeStyles(pageThemeCtx.themeId),
                  backgroundColor: "var(--page-bg, hsl(var(--background)))",
                  color: "var(--page-text, hsl(var(--foreground)))",
                  fontFamily: "var(--page-font, inherit)",
                  borderRadius: deviceMode === "mobile" ? undefined : "var(--page-radius, 0.75rem)",
                }}>
                <div className="p-0 flex-1 flex flex-col">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSortEnd}>
                    <SortableContext items={blocks.filter(b => b.is_visible || editingBlockId === b.id).map(b => b.id)} strategy={verticalListSortingStrategy}>
                      {blocks.filter(b => b.is_visible || editingBlockId === b.id).map(block => (
                        <SortablePreviewBlock
                          key={block.id} block={block}
                          editingBlockId={editingBlockId}
                          onSelect={() => setEditingBlockId(block.id)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                  {blocks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 min-h-[300px] text-muted-foreground">
                      <Plus className="w-8 h-8 mb-2" />
                      <p className="text-sm">Add your first block</p>
                    </div>
                  ) : (
                    /* Spacer fills remaining canvas height on desktop so the page never looks half-empty */
                    <div className="flex-1" aria-hidden="true" />
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* ═══ Right Panel — Block Editor ═══ */}
        {editingBlock && !isMobile && (
          <div className="w-72 shrink-0 border-l border-border/40 bg-card/30 overflow-y-auto p-3">
            <BlockEditor
              block={editingBlock}
              onChange={updateBlock}
              onDelete={() => deleteBlock(editingBlock.id)}
              onClose={() => setEditingBlockId(null)}
            />
          </div>
        )}
      </div>

      {/* ═══ Mobile Bottom Bar ═══ */}
      {isMobile && (
        <>
          <div className="bg-card/90 backdrop-blur-md border-t border-border/40 p-2 shrink-0">
            <div className="flex items-center gap-2 overflow-x-auto">
              {blocks.map(block => {
                const meta = BLOCK_TYPES.find(b => b.id === block.block_type);
                return (
                  <button
                    key={block.id}
                    onClick={() => setEditingBlockId(block.id)}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] whitespace-nowrap shrink-0 border",
                      editingBlockId === block.id
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "text-muted-foreground border-border/40"
                    )}
                  >
                    {meta?.label ?? block.block_type}
                  </button>
                );
              })}
              <button onClick={() => setAddBlockOpen(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] text-primary border border-primary/30 whitespace-nowrap shrink-0">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
          </div>

          <Sheet open={!!editingBlockId} onOpenChange={(open) => !open && setEditingBlockId(null)}>
            <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl overflow-y-auto p-4">
              {editingBlock && (
                <BlockEditor
                  block={editingBlock}
                  onChange={updateBlock}
                  onDelete={() => deleteBlock(editingBlock.id)}
                  onClose={() => setEditingBlockId(null)}
                />
              )}
            </SheetContent>
          </Sheet>
        </>
      )}

      {/* ═══ Sheets & Dialogs ═══ */}
      <Sheet open={addBlockOpen} onOpenChange={setAddBlockOpen}>
        <SheetContent side={isMobile ? "bottom" : "right"} className={cn(isMobile ? "h-[80vh] rounded-t-3xl" : "", "overflow-y-auto")}>
          <div className="space-y-4 p-2">
            <h3 className="text-sm font-semibold">Add Block</h3>
            <div className="grid grid-cols-2 gap-2">
              {BLOCK_TYPES.map(bt => {
                const Icon = ICON_MAP[bt.icon] ?? FileText;
                return (
                  <button
                    key={bt.id}
                    onClick={() => addBlock(bt.id)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all text-center"
                  >
                    <Icon className="w-5 h-5 text-primary" />
                    <span className="text-[11px] font-medium">{bt.label}</span>
                    <span className="text-[9px] text-muted-foreground">{bt.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={templateOpen} onOpenChange={setTemplateOpen}>
        <SheetContent side={isMobile ? "bottom" : "right"} className={cn(isMobile ? "h-[80vh] rounded-t-3xl" : "", "overflow-y-auto")}>
          <div className="space-y-4 p-2">
            <h3 className="text-sm font-semibold">Page Templates</h3>
            <p className="text-xs text-muted-foreground">Start from a pre-built template.</p>
            <div className="grid grid-cols-1 gap-3">
              {PAGE_TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => addFromTemplate(t)}
                  className="flex items-center gap-3 p-4 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
                >
                  <span className="text-2xl">{t.icon}</span>
                  <div>
                    <span className="text-sm font-medium block">{t.label}</span>
                    <span className="text-xs text-muted-foreground">{t.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!confirmDeleteBlock}
        onOpenChange={(open) => !open && setConfirmDeleteBlock(null)}
        title="Delete Block?"
        description="This block and its content will be permanently removed."
        onConfirm={() => confirmDeleteBlock && deleteBlock(confirmDeleteBlock)}
      />
      <ConfirmDialog
        open={!!confirmDeletePage}
        onOpenChange={(open) => !open && setConfirmDeletePage(null)}
        title="Delete Page?"
        description="This page and all its blocks will be permanently removed."
        onConfirm={() => confirmDeletePage && deletePage(confirmDeletePage)}
      />
      <ConfirmDialog
        open={confirmBulkDelete}
        onOpenChange={setConfirmBulkDelete}
        title={`Delete ${selectedBlockIds.size} Block(s)?`}
        description="All selected blocks will be permanently removed."
        onConfirm={bulkDeleteBlocks}
      />
    </div>
  );
}

function PBThemeSwitcher() {
  const { themeId, setThemeId } = usePageTheme();
  const colorThemes = PAGE_THEMES.filter(t => t.type === "color");
  const layoutThemes = PAGE_THEMES.filter(t => t.type === "layout");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Page Theme">
          <Paintbrush className="w-3.5 h-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 max-h-80 overflow-y-auto">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Color Schemes
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {colorThemes.map((t) => (
          <DropdownMenuItem key={t.id} onClick={() => setThemeId(t.id)} className="flex items-center gap-2 cursor-pointer">
            <span className="w-3 h-3 rounded-full shrink-0 border border-border" style={{ background: t.preview }} />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium">{t.label}</span>
              <p className="text-[9px] text-muted-foreground truncate">{t.description}</p>
            </div>
            {themeId === t.id && <Check className="w-3 h-3 text-primary shrink-0" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Layout Themes
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {layoutThemes.map((t) => (
          <DropdownMenuItem key={t.id} onClick={() => setThemeId(t.id)} className="flex items-center gap-2 cursor-pointer">
            <span className="w-3 h-3 rounded-full shrink-0 border border-border" style={{ background: t.preview }} />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium">{t.label}</span>
              <p className="text-[9px] text-muted-foreground truncate">{t.description}</p>
            </div>
            {themeId === t.id && <Check className="w-3 h-3 text-primary shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PageBuilderWithTheme() {
  return (
    <PageThemeProvider>
      <PageBuilderPage />
    </PageThemeProvider>
  );
}

export default PageBuilderWithTheme;
