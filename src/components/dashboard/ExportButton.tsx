import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { NfcStats } from "@/hooks/useNfcData";

interface ExportButtonProps {
  stats: NfcStats;
  chartData: { label: string; taps: number; vcards: number }[];
}

export function ExportButton({ stats, chartData }: ExportButtonProps) {
  const handleExport = () => {
    const rows: string[][] = [];
    const sep = () => rows.push([]);

    // Header
    rows.push(["HANDSHAKE — NFC ANALYTICS REPORT"]);
    rows.push([`Generated: ${new Date().toLocaleString()}`]);
    sep();

    // ─── OVERVIEW ───
    rows.push(["═══ OVERVIEW ═══"]);
    rows.push(["Metric", "Value"]);
    rows.push(["Total Profile Views", String(stats.totalTaps)]);
    rows.push(["Unique Visitors", String(stats.uniqueVisitors)]);
    rows.push(["Return Visitor Rate", `${stats.returnVisitorRate}%`]);
    rows.push(["Interaction Depth", `${stats.interactionDepthRate}%`]);
    rows.push(["Contact Save Rate", `${stats.contactSaveRate}%`]);
    rows.push(["Avg Dwell Time", `${stats.avgDwellTime}s`]);
    sep();

    // ─── ENGAGEMENT ───
    rows.push(["═══ ENGAGEMENT ═══"]);
    rows.push(["Metric", "Value"]);
    rows.push(["vCard Downloads", String(stats.vcardDownloads)]);
    rows.push(["CV Downloads", String(stats.cvDownloads)]);
    rows.push(["Card Flips", String(stats.cardFlips)]);
    rows.push(["Video Plays", String(stats.videoPlays)]);
    rows.push(["Contact Form Submissions", String(stats.contactFormSubmissions)]);
    rows.push(["Leads Captured", String(stats.leadGenCount)]);
    sep();

    // ─── SECURITY ───
    rows.push(["═══ SECURITY ═══"]);
    rows.push(["Metric", "Value"]);
    rows.push(["Auth Success Rate", `${stats.authSuccessRate}%`]);
    rows.push(["Unauthorized Attempts", String(stats.unauthorizedAttempts)]);
    sep();

    // ─── DEVICE BREAKDOWN ───
    if (stats.deviceBreakdown.length > 0) {
      rows.push(["═══ DEVICE BREAKDOWN ═══"]);
      rows.push(["Device", "Count", "Share %"]);
      const total = stats.deviceBreakdown.reduce((s, d) => s + d.value, 0);
      stats.deviceBreakdown.forEach((d) =>
        rows.push([d.name, String(d.value), `${total > 0 ? Math.round((d.value / total) * 100) : 0}%`])
      );
      // ASCII bar chart
      const max = Math.max(...stats.deviceBreakdown.map((d) => d.value));
      rows.push([]);
      rows.push(["Device", "Distribution"]);
      stats.deviceBreakdown.forEach((d) => {
        const bars = max > 0 ? Math.round((d.value / max) * 20) : 0;
        rows.push([d.name, "█".repeat(bars) + "░".repeat(20 - bars) + ` (${d.value})`]);
      });
      sep();
    }

    // ─── BROWSER BREAKDOWN ───
    if (stats.browserBreakdown.length > 0) {
      rows.push(["═══ BROWSER BREAKDOWN ═══"]);
      rows.push(["Browser", "Count", "Share %"]);
      const total = stats.browserBreakdown.reduce((s, d) => s + d.value, 0);
      stats.browserBreakdown.forEach((d) =>
        rows.push([d.name, String(d.value), `${total > 0 ? Math.round((d.value / total) * 100) : 0}%`])
      );
      sep();
    }

    // ─── OS BREAKDOWN ───
    if (stats.osBreakdown.length > 0) {
      rows.push(["═══ OS BREAKDOWN ═══"]);
      rows.push(["OS", "Count", "Share %"]);
      const total = stats.osBreakdown.reduce((s, d) => s + d.value, 0);
      stats.osBreakdown.forEach((d) =>
        rows.push([d.name, String(d.value), `${total > 0 ? Math.round((d.value / total) * 100) : 0}%`])
      );
      sep();
    }

    // ─── LINK CTR ───
    if (stats.linkCTR.length > 0) {
      rows.push(["═══ LINK CLICK-THROUGH RATES ═══"]);
      rows.push(["Link", "Clicks", "CTR %", "Performance"]);
      const maxClicks = Math.max(...stats.linkCTR.map((l) => l.clicks));
      stats.linkCTR.forEach((l) => {
        const bars = maxClicks > 0 ? Math.round((l.clicks / maxClicks) * 15) : 0;
        rows.push([l.name, String(l.clicks), `${l.percentage}%`, "█".repeat(bars)]);
      });
      sep();
    }

    // ─── CTA CLICKS ───
    if (stats.ctaClicks.length > 0) {
      rows.push(["═══ CTA CLICK BREAKDOWN ═══"]);
      rows.push(["CTA Label", "Clicks"]);
      stats.ctaClicks.forEach((c) => rows.push([c.label, String(c.clicks)]));
      sep();
    }

    // ─── PERSONA PERFORMANCE ───
    if (stats.personaPerformance.length > 0) {
      rows.push(["═══ PERSONA PERFORMANCE ═══"]);
      rows.push(["Persona", "Profile Views", "Save Rate %", "Performance"]);
      const maxTaps = Math.max(...stats.personaPerformance.map((p) => p.taps));
      stats.personaPerformance.forEach((p) => {
        const bars = maxTaps > 0 ? Math.round((p.taps / maxTaps) * 15) : 0;
        rows.push([p.name, String(p.taps), `${p.saveRate}%`, "█".repeat(bars)]);
      });
      sep();
    }

    // ─── CONNECTION SOURCES ───
    rows.push(["═══ CONNECTION SOURCES ═══"]);
    rows.push(["Source", "Count"]);
    rows.push(["NFC Tap", String(stats.connectionSources.nfc)]);
    rows.push(["QR Scan", String(stats.connectionSources.qr)]);
    rows.push(["Direct Link", String(stats.connectionSources.direct)]);
    sep();

    // ─── TIMELINE DATA ───
    if (chartData.length > 0) {
      rows.push(["═══ TIMELINE DATA ═══"]);
      rows.push(["Period", "Profile Views", "vCard Saves", "Trend"]);
      const maxT = Math.max(...chartData.map((p) => p.taps));
      chartData.forEach((p) => {
        const bars = maxT > 0 ? Math.round((p.taps / maxT) * 10) : 0;
        rows.push([p.label, String(p.taps), String(p.vcards), "▓".repeat(bars)]);
      });
    }

    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `handshake-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={handleExport}>
      <Download className="w-3 h-3" />
      Export CSV
    </Button>
  );
}
