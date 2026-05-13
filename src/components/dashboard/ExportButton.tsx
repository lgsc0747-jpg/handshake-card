import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { NfcStats } from "@/hooks/useNfcData";

interface ExportButtonProps {
  stats: NfcStats;
  chartData: { label: string; taps: number; vcards: number }[];
}

/** Escape a value for CSV (RFC 4180). Preserves leading "=" so spreadsheet apps evaluate formulas. */
const csv = (v: string | number | null | undefined): string => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function ExportButton({ stats, chartData }: ExportButtonProps) {
  const handleExport = () => {
    const rows: (string | number)[][] = [];
    const push = (...r: (string | number)[][]) => rows.push(...r);

    // ── Header ─────────────────────────────────────────────
    push(
      ["Handshake — Analytics Export"],
      [`Generated`, new Date().toLocaleString()],
      [],
    );

    // ── Headline KPIs ──────────────────────────────────────
    push(["Headline Metrics"], ["Metric", "Value"]);
    const kpiStart = rows.length + 1; // 1-indexed for spreadsheet
    const kpis: [string, number][] = [
      ["Profile Views", stats.totalTaps],
      ["Unique Visitors", stats.uniqueVisitors],
      ["Leads Captured", stats.leadGenCount],
      ["vCard Downloads", stats.vcardDownloads],
      ["CV Downloads", stats.cvDownloads],
      ["Card Flips", stats.cardFlips],
      ["Video Plays", stats.videoPlays],
      ["Contact Form Submissions", stats.contactFormSubmissions],
    ];
    kpis.forEach(([k, v]) => push([k, v]));
    const kpiEnd = rows.length;
    push(
      ["Total interactions", `=SUM(B${kpiStart}:B${kpiEnd})`],
      ["Lead conversion rate", `=IFERROR(B${kpiStart + 2}/B${kpiStart},0)`],
      [],
    );

    // ── Timeline ───────────────────────────────────────────
    if (chartData.length > 0) {
      push(["Timeline"], ["Period", "Profile Views", "vCard Saves", "Save Rate"]);
      const tStart = rows.length + 1;
      chartData.forEach((p, i) => {
        const r = tStart + i;
        push([p.label, p.taps, p.vcards, `=IFERROR(C${r}/B${r},0)`]);
      });
      const tEnd = rows.length;
      push(
        ["Totals", `=SUM(B${tStart}:B${tEnd})`, `=SUM(C${tStart}:C${tEnd})`, `=IFERROR(C${tEnd + 1}/B${tEnd + 1},0)`],
        ["Average per period", `=IFERROR(AVERAGE(B${tStart}:B${tEnd}),0)`, `=IFERROR(AVERAGE(C${tStart}:C${tEnd}),0)`, ""],
        ["Peak views", `=IFERROR(MAX(B${tStart}:B${tEnd}),0)`, "", ""],
        [],
      );
    }

    // ── Device breakdown ───────────────────────────────────
    const blocks: { title: string; data: { name: string; value: number }[] }[] = [
      { title: "Devices", data: stats.deviceBreakdown },
      { title: "Browsers", data: stats.browserBreakdown },
      { title: "Operating Systems", data: stats.osBreakdown },
    ];
    blocks.forEach(({ title, data }) => {
      if (!data?.length) return;
      push([title], ["Name", "Count", "Share"]);
      const bStart = rows.length + 1;
      data.forEach((d, i) => {
        const r = bStart + i;
        push([d.name, d.value, `=IFERROR(B${r}/SUM(B${bStart}:B${bStart + data.length - 1}),0)`]);
      });
      push(["Total", `=SUM(B${bStart}:B${bStart + data.length - 1})`, `=SUM(C${bStart}:C${bStart + data.length - 1})`], []);
    });

    // ── Connection sources ─────────────────────────────────
    const conn = [
      ["NFC Tap", stats.connectionSources.nfc],
      ["QR Scan", stats.connectionSources.qr],
      ["Direct Link", stats.connectionSources.direct],
    ] as [string, number][];
    push(["Connection Sources"], ["Source", "Count", "Share"]);
    const cStart = rows.length + 1;
    conn.forEach(([n, v], i) => {
      const r = cStart + i;
      push([n, v, `=IFERROR(B${r}/SUM(B${cStart}:B${cStart + conn.length - 1}),0)`]);
    });
    push(["Total", `=SUM(B${cStart}:B${cStart + conn.length - 1})`, `=SUM(C${cStart}:C${cStart + conn.length - 1})`]);

    // ── Build & download ───────────────────────────────────
    const text = rows.map((r) => r.map(csv).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `handshake-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button onClick={handleExport} variant="outline" size="sm" className="gap-2">
      <Download className="w-4 h-4" />
      Export CSV
    </Button>
  );
}
