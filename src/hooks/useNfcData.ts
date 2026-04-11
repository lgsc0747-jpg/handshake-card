import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type Timeframe = "thirtymin" | "daily" | "weekly" | "monthly" | "quarterly";

interface ChartPoint {
  label: string;
  taps: number;
  vcards: number;
}

interface DeviceBreakdown {
  name: string;
  value: number;
  color: string;
}

interface HourlyHeat {
  day: string;
  hour: number;
  count: number;
}

interface LinkCTR {
  name: string;
  clicks: number;
  percentage: number;
}

interface PersonaPerf {
  name: string;
  taps: number;
  saveRate: number;
}

export interface NfcStats {
  totalTaps: number;
  uniqueVisitors: number;
  contactSaveRate: number;
  avgDwellTime: number;
  profileViews: number;
  cvDownloads: number;
  vcardDownloads: number;
  topDevice: string;
  authSuccessRate: number;
  leadGenCount: number;
  unauthorizedAttempts: number;
  cardFlips: number;
  returnVisitorRate: number;
  interactionDepthRate: number;
  deviceBreakdown: DeviceBreakdown[];
  browserBreakdown: DeviceBreakdown[];
  osBreakdown: DeviceBreakdown[];
  hourlyHeat: HourlyHeat[];
  linkCTR: LinkCTR[];
  personaPerformance: PersonaPerf[];
  connectionSources: { nfc: number; qr: number; direct: number };
  tapVelocity: { label: string; taps: number }[];
  ctaClicks: { label: string; clicks: number }[];
  videoPlays: number;
  contactFormSubmissions: number;
}

const DEVICE_COLORS: Record<string, string> = {
  Mobile: "#0d9488", Desktop: "#3b82f6", Tablet: "#8b5cf6",
};
const BROWSER_COLORS: Record<string, string> = {
  Chrome: "#4285F4", Safari: "#000000", Firefox: "#FF7139", Edge: "#0078D7", Opera: "#FF1B2D", Other: "#6b7280",
};
const OS_COLORS: Record<string, string> = {
  iOS: "#A2AAAD", Android: "#3DDC84", Windows: "#0078D4", macOS: "#555555", Linux: "#FCC624", Unknown: "#6b7280",
};
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function useNfcData() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState<Timeframe>("monthly");
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [stats, setStats] = useState<NfcStats>({
    totalTaps: 0, uniqueVisitors: 0, contactSaveRate: 0, avgDwellTime: 0,
    profileViews: 0, cvDownloads: 0, vcardDownloads: 0,
    topDevice: "No data",
    authSuccessRate: 0, leadGenCount: 0, unauthorizedAttempts: 0,
    cardFlips: 0, returnVisitorRate: 0, interactionDepthRate: 0,
    deviceBreakdown: [], browserBreakdown: [], osBreakdown: [],
    hourlyHeat: [], linkCTR: [], personaPerformance: [],
    connectionSources: { nfc: 0, qr: 0, direct: 0 },
    tapVelocity: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const now = new Date();
    let since: Date;
    let points: number;
    let formatLabel: (d: Date) => string;

    if (timeframe === "thirtymin") {
      since = new Date(now.getTime() - 30 * 60 * 1000);
      points = 6; // 5-min buckets
      formatLabel = (d) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
    } else if (timeframe === "daily") {
      since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      points = 24;
      formatLabel = (d) => `${d.getHours()}:00`;
    } else if (timeframe === "weekly") {
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      points = 7;
      formatLabel = (d) => d.toLocaleDateString("en", { weekday: "short" });
    } else if (timeframe === "quarterly") {
      since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      points = 12;
      formatLabel = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
    } else {
      since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      points = 30;
      formatLabel = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
    }

    const [logsRes, personasRes, leadsRes] = await Promise.all([
      supabase.from("interaction_logs").select("*").eq("user_id", user.id)
        .gte("created_at", since.toISOString()).order("created_at", { ascending: true }),
      supabase.from("personas").select("id, label, slug").eq("user_id", user.id),
      supabase.from("lead_captures").select("id").eq("owner_user_id", user.id)
        .gte("created_at", since.toISOString()),
    ]);

    const logs = logsRes.data ?? [];
    const personas = personasRes.data ?? [];
    const leads = leadsRes.data ?? [];

    // Chart buckets
    const bucketMs = (now.getTime() - since.getTime()) / points;
    const buckets: ChartPoint[] = [];
    for (let i = 0; i < points; i++) {
      const bStart = new Date(since.getTime() + i * bucketMs);
      const bEnd = new Date(since.getTime() + (i + 1) * bucketMs);
      const inBucket = logs.filter((l) => {
        const t = new Date(l.created_at).getTime();
        return t >= bStart.getTime() && t < bEnd.getTime();
      });
      buckets.push({
        label: formatLabel(bStart),
        taps: inBucket.filter((l) => l.interaction_type === "profile_view").length,
        vcards: inBucket.filter((l) => l.interaction_type === "vcard_download").length,
      });
    }
    setChartData(buckets);

    // Aggregate ALL stats from filtered logs
    const visitors = new Set<string>();
    const devices = new Map<string, number>();
    const browsers = new Map<string, number>();
    const oses = new Map<string, number>();
    const hourlyMap = new Map<string, number>();
    const linkClicks = new Map<string, number>();
    const personaTaps = new Map<string, number>();
    const personaVcards = new Map<string, number>();
    let profileViews = 0, cvDownloads = 0, vcardDownloads = 0, cardFlips = 0;
    let totalDwell = 0, dwellCount = 0;
    let securitySuccess = 0, securityTotal = 0, unauthorizedAttempts = 0;
    let nfcSource = 0, qrSource = 0, directSource = 0;
    let returnVisitors = 0;
    const visitorsWithInteractions = new Set<string>();

    logs.forEach((log) => {
      const meta = (log.metadata as Record<string, any>) ?? {};
      visitors.add(log.entity_id);

      const device = meta.device || "Desktop";
      const browser = meta.browser || "Other";
      const os = meta.os || "Unknown";
      devices.set(device, (devices.get(device) ?? 0) + 1);
      browsers.set(browser, (browsers.get(browser) ?? 0) + 1);
      oses.set(os, (oses.get(os) ?? 0) + 1);

      const dt = new Date(log.created_at);
      const key = `${DAYS[dt.getDay()]}-${dt.getHours()}`;
      hourlyMap.set(key, (hourlyMap.get(key) ?? 0) + 1);

      if (log.interaction_type === "profile_view") {
        profileViews++;
        const source = meta.source || "direct";
        if (source === "nfc_redirect") nfcSource++;
        else if (source === "qr_scan") qrSource++;
        else directSource++;
        if (meta.is_return) returnVisitors++;
      }
      if (log.interaction_type === "cv_download") { cvDownloads++; visitorsWithInteractions.add(log.entity_id); }
      if (log.interaction_type === "vcard_download") { vcardDownloads++; visitorsWithInteractions.add(log.entity_id); }
      if (log.interaction_type === "card_flip") { cardFlips++; visitorsWithInteractions.add(log.entity_id); }
      if (log.interaction_type === "link_click") {
        const lt = meta.link_type || "unknown";
        linkClicks.set(lt, (linkClicks.get(lt) ?? 0) + 1);
        visitorsWithInteractions.add(log.entity_id);
      }
      if (log.interaction_type === "dwell_time" && meta.seconds) { totalDwell += Number(meta.seconds); dwellCount++; }
      if (log.interaction_type === "security_attempt") {
        securityTotal++;
        if (meta.result === "success") securitySuccess++;
        if (meta.result === "failed" || meta.result === "blocked") unauthorizedAttempts++;
      }

      const pSlug = meta.persona_slug;
      if (pSlug) {
        const matched = personas.find(
          (p) => p.slug === pSlug || p.label.toLowerCase().replace(/\s+/g, "-") === pSlug || p.id === pSlug
        );
        if (matched) {
          if (log.interaction_type === "profile_view") personaTaps.set(matched.id, (personaTaps.get(matched.id) ?? 0) + 1);
          if (log.interaction_type === "vcard_download") personaVcards.set(matched.id, (personaVcards.get(matched.id) ?? 0) + 1);
        }
      }
    });

    let topDevice = "No data";
    let topDeviceCount = 0;
    devices.forEach((count, name) => { if (count > topDeviceCount) { topDevice = name; topDeviceCount = count; } });

    const deviceBreakdown = Array.from(devices.entries()).map(([name, value]) => ({ name, value, color: DEVICE_COLORS[name] || "#6b7280" }));
    const browserBreakdown = Array.from(browsers.entries()).map(([name, value]) => ({ name, value, color: BROWSER_COLORS[name] || "#6b7280" }));
    const osBreakdown = Array.from(oses.entries()).map(([name, value]) => ({ name, value, color: OS_COLORS[name] || "#6b7280" }));

    const hourlyHeat: HourlyHeat[] = [];
    DAYS.forEach((day) => { for (let h = 0; h < 24; h++) hourlyHeat.push({ day, hour: h, count: hourlyMap.get(`${day}-${h}`) ?? 0 }); });

    const linkCTR: LinkCTR[] = Array.from(linkClicks.entries())
      .map(([name, clicks]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), clicks, percentage: profileViews > 0 ? Math.round((clicks / profileViews) * 100) : 0 }))
      .sort((a, b) => b.clicks - a.clicks);

    const personaPerformance: PersonaPerf[] = personas.map((p) => {
      const taps = personaTaps.get(p.id) ?? 0;
      const saves = personaVcards.get(p.id) ?? 0;
      return { name: p.label, taps, saveRate: taps > 0 ? Math.round((saves / taps) * 100) : 0 };
    }).filter((p) => p.taps > 0);

    const velocityMap = new Map<string, number>();
    logs.filter((l) => l.interaction_type === "profile_view").forEach((log) => {
      const dt = new Date(log.created_at);
      const hourKey = `${dt.getMonth() + 1}/${dt.getDate()} ${dt.getHours()}:00`;
      velocityMap.set(hourKey, (velocityMap.get(hourKey) ?? 0) + 1);
    });
    const tapVelocity = Array.from(velocityMap.entries()).map(([label, taps]) => ({ label, taps }));

    const contactSaveRate = profileViews > 0 ? Math.round((vcardDownloads / profileViews) * 100) : 0;
    const avgDwellTime = dwellCount > 0 ? Math.round(totalDwell / dwellCount) : 0;
    const authSuccessRate = securityTotal > 0 ? Math.round((securitySuccess / securityTotal) * 100) : 0;
    const returnVisitorRate = profileViews > 0 ? Math.round((returnVisitors / profileViews) * 100) : 0;
    const interactionDepthRate = visitors.size > 0 ? Math.round((visitorsWithInteractions.size / visitors.size) * 100) : 0;

    setStats({
      totalTaps: profileViews,
      uniqueVisitors: visitors.size,
      contactSaveRate,
      avgDwellTime,
      profileViews,
      cvDownloads,
      vcardDownloads,
      topDevice,
      authSuccessRate,
      leadGenCount: leads.length,
      unauthorizedAttempts,
      cardFlips,
      returnVisitorRate,
      interactionDepthRate,
      deviceBreakdown,
      browserBreakdown,
      osBreakdown,
      hourlyHeat,
      linkCTR,
      personaPerformance,
      connectionSources: { nfc: nfcSource, qr: qrSource, direct: directSource },
      tapVelocity,
    });

    setLoading(false);
  }, [user, timeframe]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interaction_logs', filter: `user_id=eq.${user.id}` }, () => { fetchData(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchData]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { stats, chartData, timeframe, setTimeframe, loading, refetch: fetchData };
}
