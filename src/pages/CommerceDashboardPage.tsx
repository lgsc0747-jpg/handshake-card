import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { UpgradeOverlay } from "@/components/UpgradePrompt";
import {
  Loader2, Download, ShoppingBag, DollarSign, TrendingUp,
  Package, Clock, CheckCircle2, XCircle, BarChart3, Wifi, ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend, AreaChart, Area,
} from "recharts";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface OrderRow {
  id: string;
  total: number;
  status: string;
  payment_method: string;
  created_at: string;
  buyer_name: string;
  buyer_location: string;
  persona_id: string;
}

interface OrderItemRow {
  quantity: number;
  unit_price: number;
  variant_info: string | null;
  product_id: string;
}

interface InteractionRow {
  interaction_type: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

type Timeframe = "7d" | "30d" | "90d" | "all";

const CommerceDashboardPage = () => {
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; stock: number; price: number; is_visible: boolean }[]>([]);
  const [interactions, setInteractions] = useState<InteractionRow[]>([]);
  const [timeframe, setTimeframe] = useState<Timeframe>("30d");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [ordersRes, itemsRes, productsRes, interactionsRes] = await Promise.all([
        supabase.from("orders").select("id, total, status, payment_method, created_at, buyer_name, buyer_location, persona_id").eq("seller_user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("order_items").select("quantity, unit_price, variant_info, product_id, order_id").order("order_id"),
        supabase.from("products").select("id, name, stock, price, is_visible").eq("user_id", user.id),
        supabase.from("interaction_logs").select("interaction_type, created_at, metadata").eq("user_id", user.id),
      ]);
      setOrders((ordersRes.data ?? []) as OrderRow[]);
      setOrderItems((itemsRes.data ?? []) as OrderItemRow[]);
      setProducts(productsRes.data ?? []);
      setInteractions((interactionsRes.data ?? []) as InteractionRow[]);
      setLoading(false);
    };
    load();
  }, [user]);

  const filteredOrders = useMemo(() => {
    if (timeframe === "all") return orders;
    const days = timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : 90;
    const cutoff = new Date(Date.now() - days * 86400000);
    return orders.filter(o => new Date(o.created_at) >= cutoff);
  }, [orders, timeframe]);

  // KPIs
  const totalRevenue = filteredOrders.reduce((s, o) => s + Number(o.total), 0);
  const totalOrders = filteredOrders.length;
  const completedOrders = filteredOrders.filter(o => o.status === "completed").length;
  const pendingOrders = filteredOrders.filter(o => o.status === "pending").length;
  const cancelledOrders = filteredOrders.filter(o => o.status === "cancelled").length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalItemsSold = orderItems.reduce((s, i) => s + i.quantity, 0);
  const lowStockProducts = products.filter(p => p.stock <= 5 && p.stock > 0);
  const outOfStockProducts = products.filter(p => p.stock <= 0);

  // NFC Conversion tracking
  const filteredInteractions = useMemo(() => {
    if (timeframe === "all") return interactions;
    const days = timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : 90;
    const cutoff = new Date(Date.now() - days * 86400000);
    return interactions.filter(i => new Date(i.created_at) >= cutoff);
  }, [interactions, timeframe]);

  const nfcTaps = filteredInteractions.filter(i => i.interaction_type === "tap").length;
  const profileViews = filteredInteractions.filter(i => i.interaction_type === "profile_view").length;
  const linkClicks = filteredInteractions.filter(i => i.interaction_type === "link_click").length;
  const nfcToOrderRate = nfcTaps > 0 ? ((totalOrders / nfcTaps) * 100).toFixed(1) : "0";
  const viewToOrderRate = profileViews > 0 ? ((totalOrders / profileViews) * 100).toFixed(1) : "0";

  const conversionFunnel = [
    { stage: "NFC Taps", count: nfcTaps },
    { stage: "Profile Views", count: profileViews },
    { stage: "Link Clicks", count: linkClicks },
    { stage: "Orders", count: totalOrders },
    { stage: "Completed", count: completedOrders },
  ];

  // Revenue over time
  const revenueTimeline = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOrders.forEach(o => {
      const day = o.created_at.slice(0, 10);
      map[day] = (map[day] || 0) + Number(o.total);
    });
    return Object.entries(map).sort().slice(-30).map(([date, revenue]) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      revenue,
    }));
  }, [filteredOrders]);

  // Orders by status
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredOrders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredOrders]);

  // Payment methods
  const paymentData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredOrders.forEach(o => { counts[o.payment_method] = (counts[o.payment_method] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: name === "cod" ? "Cash on Delivery" : name === "gcash" ? "GCash" : name, value }));
  }, [filteredOrders]);

  // Top locations
  const locationData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredOrders.forEach(o => { if (o.buyer_location) counts[o.buyer_location] = (counts[o.buyer_location] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  }, [filteredOrders]);

  // Orders per day
  const ordersPerDay = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOrders.forEach(o => {
      const day = o.created_at.slice(0, 10);
      map[day] = (map[day] || 0) + 1;
    });
    return Object.entries(map).sort().slice(-30).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      orders: count,
    }));
  }, [filteredOrders]);

  const handleExportCSV = () => {
    const rows: string[][] = [
      ["Commerce Report", new Date().toLocaleDateString()],
      [],
      ["Metric", "Value"],
      ["Total Revenue", `₱${totalRevenue.toLocaleString()}`],
      ["Total Orders", String(totalOrders)],
      ["Avg Order Value", `₱${avgOrderValue.toFixed(2)}`],
      ["Completed", String(completedOrders)],
      ["Pending", String(pendingOrders)],
      ["Cancelled", String(cancelledOrders)],
      ["Items Sold", String(totalItemsSold)],
      ["Low Stock Products", String(lowStockProducts.length)],
      ["Out of Stock", String(outOfStockProducts.length)],
      [],
      ["Order ID", "Buyer", "Location", "Total", "Status", "Payment", "Date"],
      ...filteredOrders.map(o => [o.id.slice(0, 8), o.buyer_name, o.buyer_location, String(o.total), o.status, o.payment_method, new Date(o.created_at).toLocaleDateString()]),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commerce-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" /> Commerce Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Track your storefront performance and sales</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(["7d", "30d", "90d", "all"] as Timeframe[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    timeframe === t ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  {t === "all" ? "All" : t}
                </button>
              ))}
            </div>
            {isPro && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={handleExportCSV}>
                <Download className="w-3 h-3" /> Export CSV
              </Button>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs">Revenue</span>
              </div>
              <p className="text-xl font-bold font-display">₱{totalRevenue.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <ShoppingBag className="w-4 h-4" />
                <span className="text-xs">Orders</span>
              </div>
              <p className="text-xl font-bold font-display">{totalOrders}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs">Avg Order</span>
              </div>
              <p className="text-xl font-bold font-display">₱{avgOrderValue.toFixed(0)}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Package className="w-4 h-4" />
                <span className="text-xs">Items Sold</span>
              </div>
              <p className="text-xl font-bold font-display">{totalItemsSold}</p>
            </CardContent>
          </Card>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="gap-1">
            <Clock className="w-3 h-3" /> {pendingOrders} Pending
          </Badge>
          <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-600">
            <CheckCircle2 className="w-3 h-3" /> {completedOrders} Completed
          </Badge>
          <Badge variant="secondary" className="gap-1 bg-red-500/10 text-red-600">
            <XCircle className="w-3 h-3" /> {cancelledOrders} Cancelled
          </Badge>
          {lowStockProducts.length > 0 && (
            <Badge variant="destructive" className="gap-1">
              <Package className="w-3 h-3" /> {lowStockProducts.length} Low Stock
            </Badge>
          )}
          {outOfStockProducts.length > 0 && (
            <Badge variant="destructive" className="gap-1">
              {outOfStockProducts.length} Out of Stock
            </Badge>
          )}
        </div>

        {/* Charts */}
        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="revenue" className="text-xs">Revenue</TabsTrigger>
            <TabsTrigger value="orders" className="text-xs">Orders</TabsTrigger>
            <TabsTrigger value="conversions" className="text-xs">NFC → Sales</TabsTrigger>
            <TabsTrigger value="breakdown" className="text-xs">Breakdown</TabsTrigger>
            <TabsTrigger value="inventory" className="text-xs">Inventory</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="space-y-4">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-display">Revenue Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueTimeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={revenueTimeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">No revenue data yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-display">Orders Per Day</CardTitle>
              </CardHeader>
              <CardContent>
                {ordersPerDay.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={ordersPerDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">No order data yet</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Orders */}
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-display">Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredOrders.length > 0 ? (
                  <div className="space-y-2">
                    {filteredOrders.slice(0, 10).map(o => (
                      <div key={o.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{o.buyer_name}</p>
                          <p className="text-[10px] text-muted-foreground">{o.buyer_location} · {new Date(o.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={o.status === "completed" ? "default" : o.status === "cancelled" ? "destructive" : "secondary"} className="text-[10px]">
                            {o.status}
                          </Badge>
                          <span className="text-sm font-semibold">₱{Number(o.total).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No orders yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="breakdown" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Order Status Pie */}
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display">Order Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {statusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {statusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                  )}
                </CardContent>
              </Card>

              {/* Payment Methods Pie */}
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display">Payment Methods</CardTitle>
                </CardHeader>
                <CardContent>
                  {paymentData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {paymentData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top Locations */}
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-display">Top Buyer Locations</CardTitle>
              </CardHeader>
              <CardContent>
                {locationData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={locationData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={100} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No location data</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-display">Product Inventory</CardTitle>
              </CardHeader>
              <CardContent>
                {products.length > 0 ? (
                  <div className="space-y-2">
                    {products.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground">₱{p.price.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={p.stock <= 0 ? "destructive" : p.stock <= 5 ? "secondary" : "default"}
                            className="text-[10px]"
                          >
                            {p.stock <= 0 ? "Sold Out" : `${p.stock} in stock`}
                          </Badge>
                          {!p.is_visible && (
                            <Badge variant="outline" className="text-[10px]">Hidden</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No products yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default CommerceDashboardPage;
