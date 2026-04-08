import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { cn } from "@/lib/utils";
import {
  Loader2, Plus, Save, Monitor, Smartphone, Eye, FileText,
  GripVertical, ChevronLeft, ChevronRight, Trash2, Copy, EyeOff,
  Type, AlignLeft, Image, LayoutGrid, Play, Minus, SeparatorHorizontal,
  MousePointerClick, Quote, Users, BarChart3, MessageSquareQuote,
  HelpCircle, Grid3x3, ShoppingBag, CreditCard, Mail, Share2, Code,
  Home, PanelLeftClose, PanelLeft, FilePlus,
} from "lucide-react";

const ICON_MAP: Record<string, any> = {
  Type, AlignLeft, Image, LayoutGrid, Play, Minus, SeparatorHorizontal,
  MousePointerClick, Quote, Users, BarChart3, MessageSquareQuote,
  HelpCircle, Grid3x3, ShoppingBag, CreditCard, Mail, Share2, Code,
};

const PageBuilderPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [personas, setPersonas] = useState<{ id: string; label: string; slug: string }[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [pages, setPages] = useState<SitePage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("mobile");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [addBlockOpen, setAddBlockOpen] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Load personas
  useEffect(() => {
    if (!user) return;
    supabase.from("personas").select("id, label, slug").eq("user_id", user.id).order("created_at").then(({ data }) => {
      const list = data ?? [];
      setPersonas(list);
      if (list.length > 0) setSelectedPersonaId(list[0].id);
      setLoading(false);
    });
  }, [user]);

  // Load pages for persona
  useEffect(() => {
    if (!user || !selectedPersonaId) return;
    loadPages();
  }, [user, selectedPersonaId]);

  const loadPages = async () => {
    const { data } = await supabase
      .from("site_pages")
      .select("*")
      .eq("persona_id", selectedPersonaId!)
      .eq("user_id", user!.id)
      .order("sort_order");

    if (data && data.length > 0) {
      setPages(data as SitePage[]);
      if (!selectedPageId || !data.find(p => p.id === selectedPageId)) {
        setSelectedPageId(data[0].id);
      }
    } else {
      // Create default homepage
      const { data: newPage } = await supabase.from("site_pages").insert({
        persona_id: selectedPersonaId!,
        user_id: user!.id,
        title: "Home",
        slug: "home",
        is_homepage: true,
        sort_order: 0,
      }).select().single();
      if (newPage) {
        setPages([newPage as SitePage]);
        setSelectedPageId(newPage.id);
        // Add default blocks
        const defaultBlocks = [
          { block_type: "heading", content: { text: "Welcome", subtitle: "Your personal page", fontSize: 36 }, styles: { alignment: "center", paddingY: 40 }, sort_order: 0 },
          { block_type: "text", content: { text: "Click any block to edit it. Add new blocks from the + button.", fontSize: 16 }, styles: { alignment: "center", maxWidth: "640px" }, sort_order: 1 },
          { block_type: "nfc_card", content: {}, styles: { alignment: "center", paddingY: 32 }, sort_order: 2 },
          { block_type: "divider", content: { thickness: 1 }, styles: { paddingY: 16 }, sort_order: 3 },
          { block_type: "contact", content: { title: "Get in Touch", buttonText: "Send" }, styles: { maxWidth: "640px" }, sort_order: 4 },
        ];
        await supabase.from("page_blocks").insert(
          defaultBlocks.map(b => ({ ...b, page_id: newPage.id, user_id: user!.id }))
        );
      }
    }
  };

  // Load blocks for selected page
  useEffect(() => {
    if (!selectedPageId || !user) return;
    loadBlocks();
  }, [selectedPageId, user]);

  const loadBlocks = async () => {
    const { data } = await supabase
      .from("page_blocks")
      .select("*")
      .eq("page_id", selectedPageId!)
      .eq("user_id", user!.id)
      .order("sort_order");
    setBlocks((data as PageBlock[]) ?? []);
  };

  const addPage = async () => {
    if (!user || !selectedPersonaId) return;
    const title = `Page ${pages.length + 1}`;
    const slug = title.toLowerCase().replace(/\s+/g, "-");
    const { data } = await supabase.from("site_pages").insert({
      persona_id: selectedPersonaId,
      user_id: user.id,
      title,
      slug,
      sort_order: pages.length,
    }).select().single();
    if (data) {
      setPages([...pages, data as SitePage]);
      setSelectedPageId(data.id);
    }
  };

  const deletePage = async (id: string) => {
    if (pages.length <= 1) { toast({ title: "Can't delete last page" }); return; }
    await supabase.from("site_pages").delete().eq("id", id);
    const remaining = pages.filter(p => p.id !== id);
    setPages(remaining);
    if (selectedPageId === id) setSelectedPageId(remaining[0]?.id ?? null);
  };

  const updatePageTitle = async (id: string, title: string) => {
    await supabase.from("site_pages").update({ title, slug: title.toLowerCase().replace(/\s+/g, "-") }).eq("id", id);
    setPages(pages.map(p => p.id === id ? { ...p, title, slug: title.toLowerCase().replace(/\s+/g, "-") } : p));
  };

  const addBlock = async (type: BlockTypeId) => {
    if (!user || !selectedPageId) return;
    const newBlock = {
      page_id: selectedPageId,
      user_id: user.id,
      block_type: type,
      content: {},
      styles: {},
      sort_order: blocks.length,
    };
    const { data } = await supabase.from("page_blocks").insert(newBlock).select().single();
    if (data) {
      setBlocks([...blocks, data as PageBlock]);
      setEditingBlockId(data.id);
      setAddBlockOpen(false);
    }
  };

  const updateBlock = (updated: PageBlock) => {
    setBlocks(blocks.map(b => b.id === updated.id ? updated : b));
  };

  const deleteBlock = async (id: string) => {
    await supabase.from("page_blocks").delete().eq("id", id);
    setBlocks(blocks.filter(b => b.id !== id));
    setEditingBlockId(null);
  };

  const duplicateBlock = async (block: PageBlock) => {
    if (!user) return;
    const { data } = await supabase.from("page_blocks").insert({
      page_id: block.page_id,
      user_id: user.id,
      block_type: block.block_type,
      content: block.content,
      styles: block.styles,
      sort_order: block.sort_order + 1,
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

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const updated = [...blocks];
    const [moved] = updated.splice(dragIdx, 1);
    updated.splice(idx, 0, moved);
    updated.forEach((b, i) => b.sort_order = i);
    setBlocks(updated);
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  const editingBlock = blocks.find(b => b.id === editingBlockId) ?? null;
  const selectedPage = pages.find(p => p.id === selectedPageId);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (personas.length === 0) {
    return (
      <DashboardLayout>
        <div className="glass-card rounded-2xl p-12 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            Create a persona in the <a href="/personas" className="text-primary underline">Persona Vault</a> first.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-3">
        {/* Top Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-display font-bold">Page Builder</h1>
            <Select value={selectedPersonaId ?? ""} onValueChange={setSelectedPersonaId}>
              <SelectTrigger className="w-36 rounded-xl h-8 text-xs">
                <SelectValue placeholder="Persona" />
              </SelectTrigger>
              <SelectContent>
                {personas.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
              <Button size="sm" variant={deviceMode === "desktop" ? "default" : "ghost"} className="h-6 w-6 p-0" onClick={() => setDeviceMode("desktop")}>
                <Monitor className="w-3 h-3" />
              </Button>
              <Button size="sm" variant={deviceMode === "mobile" ? "default" : "ghost"} className="h-6 w-6 p-0" onClick={() => setDeviceMode("mobile")}>
                <Smartphone className="w-3 h-3" />
              </Button>
            </div>
            <Button onClick={saveAll} disabled={saving} size="sm" className="gradient-primary text-primary-foreground rounded-xl h-8 text-xs">
              {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
              Save
            </Button>
          </div>
        </div>

        {/* Page Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {pages.map(page => (
            <button
              key={page.id}
              onClick={() => setSelectedPageId(page.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border",
                selectedPageId === page.id
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "text-muted-foreground border-border/40 hover:border-primary/20"
              )}
            >
              {page.is_homepage && <Home className="w-3 h-3" />}
              {page.title}
            </button>
          ))}
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={addPage}>
            <FilePlus className="w-3.5 h-3.5 mr-1" /> Add Page
          </Button>
        </div>

        {/* Main Layout */}
        <div className="flex gap-0 rounded-2xl border border-border/60 bg-card/30 backdrop-blur-sm overflow-hidden" style={{ height: "calc(100vh - 220px)" }}>
          {/* Left Sidebar — Page settings & block list */}
          {sidebarOpen && (
            <div className="w-64 shrink-0 border-r border-border/40 bg-card/50 hidden md:flex flex-col overflow-hidden">
              {/* Page settings */}
              <div className="p-3 border-b border-border/40 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={selectedPage?.title ?? ""}
                    onChange={(e) => selectedPage && updatePageTitle(selectedPage.id, e.target.value)}
                    className="h-7 text-xs font-semibold"
                  />
                  {pages.length > 1 && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => selectedPage && deletePage(selectedPage.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Block list */}
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2 py-1">Blocks</p>
                  {blocks.map((block, idx) => {
                    const meta = BLOCK_TYPES.find(b => b.id === block.block_type);
                    const Icon = meta ? ICON_MAP[meta.icon] ?? FileText : FileText;
                    return (
                      <div
                        key={block.id}
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setEditingBlockId(block.id)}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-all",
                          editingBlockId === block.id
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted/50",
                          !block.is_visible && "opacity-40"
                        )}
                      >
                        <GripVertical className="w-3 h-3 cursor-grab shrink-0" />
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate flex-1">{meta?.label ?? block.block_type}</span>
                        <div className="flex gap-0.5">
                          <button onClick={(e) => { e.stopPropagation(); duplicateBlock(block); }} className="p-0.5 hover:text-primary">
                            <Copy className="w-3 h-3" />
                          </button>
                          {!block.is_visible && <EyeOff className="w-3 h-3" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Add block button */}
              <div className="p-2 border-t border-border/40">
                <Button variant="outline" size="sm" className="w-full text-xs h-8 rounded-xl" onClick={() => setAddBlockOpen(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Block
                </Button>
              </div>
            </div>
          )}

          {/* Toggle sidebar */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:flex items-center justify-center w-5 bg-card/50 hover:bg-muted/50 border-r border-border/40 transition-colors"
          >
            {sidebarOpen ? <PanelLeftClose className="w-3 h-3 text-muted-foreground" /> : <PanelLeft className="w-3 h-3 text-muted-foreground" />}
          </button>

          {/* Center Preview */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="flex justify-center p-4 md:p-8">
                <div
                  className={cn(
                    "relative transition-all duration-300 bg-background",
                    deviceMode === "mobile"
                      ? "w-[375px] min-h-[667px] border-[6px] border-muted-foreground/15 rounded-[2.5rem]"
                      : "w-full max-w-4xl min-h-[500px] rounded-2xl border border-border/60"
                  )}
                >
                  <div className="p-0">
                    {blocks.filter(b => b.is_visible || editingBlockId === b.id).map(block => (
                      <BlockRenderer
                        key={block.id}
                        block={block}
                        isEditing={true}
                        onClick={() => setEditingBlockId(block.id)}
                      />
                    ))}
                    {blocks.length === 0 && (
                      <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground">
                        <Plus className="w-8 h-8 mb-2" />
                        <p className="text-sm">Add your first block</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel — Block Editor */}
          {editingBlock && !isMobile && (
            <div className="w-80 shrink-0 border-l border-border/40 bg-card/50 overflow-y-auto p-4">
              <BlockEditor
                block={editingBlock}
                onChange={updateBlock}
                onDelete={() => deleteBlock(editingBlock.id)}
                onClose={() => setEditingBlockId(null)}
              />
            </div>
          )}
        </div>

        {/* Mobile: Bottom bar for blocks + FAB */}
        {isMobile && (
          <>
            {/* Block list bottom sheet trigger */}
            <div className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-md border-t border-border/40 p-2 z-40">
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

            {/* Mobile block editor sheet */}
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
      </div>

      {/* Add Block Dialog */}
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
    </DashboardLayout>
  );
};

export default PageBuilderPage;
