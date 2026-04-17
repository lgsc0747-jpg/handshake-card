import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { NfcStats } from "@/hooks/useNfcData";

interface ExportButtonProps {
  stats: NfcStats;
  chartData: { label: string; taps: number; vcards: number }[];
}

/* ─── Brand palette (light dashboard report) ───────────────── */
const C = {
  ink: "FF0F172A",          // slate-900
  inkSoft: "FF334155",      // slate-700
  muted: "FF64748B",        // slate-500
  line: "FFE2E8F0",         // slate-200
  surface: "FFF8FAFC",      // slate-50
  surfaceAlt: "FFF1F5F9",   // slate-100
  white: "FFFFFFFF",
  brand: "FF0D9488",        // teal-600 (primary)
  brandSoft: "FFCCFBF1",    // teal-100
  accent: "FF3B82F6",       // blue-500
  warn: "FFF97316",         // orange-500
  success: "FF10B981",      // emerald-500
  danger: "FFEF4444",       // red-500
} as const;

const FONT = "Inter";

export function ExportButton({ stats, chartData }: ExportButtonProps) {
  const handleExport = async () => {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "Handshake";
    wb.created = new Date();

    /* ─── Style primitives ─────────────────────────────────── */
    const thinBorder = (color: string = C.line) => ({
      top: { style: "thin" as const, color: { argb: color } },
      left: { style: "thin" as const, color: { argb: color } },
      bottom: { style: "thin" as const, color: { argb: color } },
      right: { style: "thin" as const, color: { argb: color } },
    });
    const cardBorder = {
      top: { style: "medium" as const, color: { argb: C.line } },
      left: { style: "medium" as const, color: { argb: C.line } },
      bottom: { style: "medium" as const, color: { argb: C.line } },
      right: { style: "medium" as const, color: { argb: C.line } },
    };
    const fill = (argb: string) => ({ type: "pattern" as const, pattern: "solid" as const, fgColor: { argb } });

    /* Setup any sheet with the dashboard look. */
    const setupSheet = (ws: any, cols = 12) => {
      ws.views = [{ showGridLines: false, showRowColHeaders: false }];
      ws.properties.defaultRowHeight = 22;
      for (let i = 1; i <= cols; i++) {
        ws.getColumn(i).width = i === 1 ? 4 : 18; // col A is breathing room
      }
    };

    /* Title bar (large heading + subtitle). */
    const titleBar = (ws: any, row: number, span: number, title: string, subtitle?: string) => {
      ws.mergeCells(row, 2, row, span);
      const t = ws.getCell(row, 2);
      t.value = title;
      t.font = { name: FONT, bold: true, size: 22, color: { argb: C.ink } };
      t.alignment = { vertical: "middle", horizontal: "left" };
      ws.getRow(row).height = 36;
      if (subtitle) {
        ws.mergeCells(row + 1, 2, row + 1, span);
        const s = ws.getCell(row + 1, 2);
        s.value = subtitle;
        s.font = { name: FONT, size: 10, color: { argb: C.muted } };
        s.alignment = { vertical: "middle", horizontal: "left" };
        ws.getRow(row + 1).height = 18;
        return row + 3;
      }
      return row + 2;
    };

    /* Section header pill. */
    const sectionHeader = (ws: any, row: number, span: number, label: string) => {
      ws.mergeCells(row, 2, row, span);
      const c = ws.getCell(row, 2);
      c.value = label.toUpperCase();
      c.font = { name: FONT, bold: true, size: 10, color: { argb: C.brand } };
      c.alignment = { vertical: "middle", horizontal: "left" };
      ws.getRow(row).height = 24;
      return row + 1;
    };

    /* Table header row. */
    const tableHeader = (ws: any, row: number, startCol: number, labels: string[]) => {
      labels.forEach((lbl, i) => {
        const c = ws.getCell(row, startCol + i);
        c.value = lbl;
        c.font = { name: FONT, bold: true, size: 10, color: { argb: C.white } };
        c.fill = fill(C.ink);
        c.alignment = { vertical: "middle", horizontal: i === 0 ? "left" : "center", indent: i === 0 ? 1 : 0 };
        c.border = thinBorder(C.ink);
      });
      ws.getRow(row).height = 26;
    };

    /* Table body row with zebra striping. */
    const styleBodyRow = (ws: any, row: number, startCol: number, endCol: number, zebra: boolean) => {
      const r = ws.getRow(row);
      r.height = 22;
      for (let c = startCol; c <= endCol; c++) {
        const cell = r.getCell(c);
        cell.font = cell.font ?? { name: FONT, size: 10, color: { argb: C.inkSoft } };
        if (!cell.font.name) cell.font = { ...cell.font, name: FONT };
        cell.alignment = cell.alignment ?? { vertical: "middle", horizontal: c === startCol ? "left" : "right", indent: c === startCol ? 1 : 0 };
        cell.border = thinBorder();
        if (zebra) cell.fill = fill(C.surface);
      }
    };

    /* KPI summary card (3 columns wide × 4 rows tall, merged). */
    const summaryCard = (
      ws: any,
      row: number,
      col: number,
      label: string,
      value: string | number,
      accent: string,
    ) => {
      // Merge a 4-col × 4-row block
      const colEnd = col + 3;
      const rowEnd = row + 3;
      ws.mergeCells(row, col, rowEnd, colEnd);
      const cell = ws.getCell(row, col);
      cell.fill = fill(C.white);
      cell.border = cardBorder;
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.value = {
        richText: [
          { text: `${label}\n`, font: { name: FONT, size: 10, color: { argb: C.muted }, bold: false } },
          { text: `\n${value}`, font: { name: FONT, size: 26, color: { argb: accent }, bold: true } },
        ],
      };
      // Set heights
      for (let r = row; r <= rowEnd; r++) ws.getRow(r).height = 22;
    };

    /* Native Excel data bar conditional formatting. */
    const addDataBar = (ws: any, sqref: string, color: string) => {
      ws.addConditionalFormatting({
        ref: sqref,
        rules: [
          {
            type: "dataBar",
            cfvo: [{ type: "min" }, { type: "max" }],
            color: { argb: color },
            gradient: true,
            showValue: true,
          } as any,
        ],
      });
    };

    /* ════════════════════════════════════════════════════════
       SHEET 1 — SUMMARY (hero cards + headline KPIs)
       ════════════════════════════════════════════════════════ */
    const wsSummary = wb.addWorksheet("Summary", {
      properties: { tabColor: { argb: C.brand } },
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
    });
    setupSheet(wsSummary, 14);

    let r = 2;
    r = titleBar(
      wsSummary,
      r,
      14,
      "Handshake — Analytics Report",
      `Generated ${new Date().toLocaleString()}  ·  Dashboard snapshot`,
    );

    // Three hero cards across columns B–E, F–I, J–M
    summaryCard(wsSummary, r, 2, "Total Profile Views", stats.totalTaps, C.brand);
    summaryCard(wsSummary, r, 6, "Unique Visitors", stats.uniqueVisitors, C.accent);
    summaryCard(wsSummary, r, 10, "Leads Captured", stats.leadGenCount, C.warn);
    r += 5;

    // Secondary KPI strip
    r = sectionHeader(wsSummary, r, 14, "Headline metrics");
    tableHeader(wsSummary, r, 2, ["Metric", "Value", "Trend"]);
    r++;
    const kpis: { label: string; value: number; suffix?: string }[] = [
      { label: "Profile Views", value: stats.totalTaps },
      { label: "Unique Visitors", value: stats.uniqueVisitors },
      { label: "Return Visitor Rate", value: stats.returnVisitorRate, suffix: "%" },
      { label: "Interaction Depth", value: stats.interactionDepthRate, suffix: "%" },
      { label: "Contact Save Rate", value: stats.contactSaveRate, suffix: "%" },
      { label: "Avg Dwell Time (s)", value: stats.avgDwellTime },
      { label: "vCard Downloads", value: stats.vcardDownloads },
      { label: "CV Downloads", value: stats.cvDownloads },
      { label: "Card Flips", value: stats.cardFlips },
      { label: "Video Plays", value: stats.videoPlays },
      { label: "Contact Forms", value: stats.contactFormSubmissions },
      { label: "Auth Success Rate", value: stats.authSuccessRate, suffix: "%" },
    ];
    // Merge metric col across B-D, value across E-H, trend across I-N
    const kpiStartRow = r;
    kpis.forEach((k, i) => {
      const row = wsSummary.getRow(r);
      wsSummary.mergeCells(r, 2, r, 4);
      wsSummary.mergeCells(r, 5, r, 8);
      wsSummary.mergeCells(r, 9, r, 14);
      row.getCell(2).value = k.label;
      row.getCell(5).value = k.suffix ? `${k.value}${k.suffix}` : k.value;
      row.getCell(9).value = k.value;
      row.getCell(2).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      row.getCell(5).alignment = { vertical: "middle", horizontal: "right", indent: 1 };
      row.getCell(9).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      [2, 5, 9].forEach((c) => {
        row.getCell(c).font = { name: FONT, size: 10, color: { argb: C.inkSoft } };
        row.getCell(c).border = thinBorder();
        if (i % 2 === 0) row.getCell(c).fill = fill(C.surface);
      });
      row.height = 22;
      r++;
    });
    addDataBar(wsSummary, `I${kpiStartRow}:N${r - 1}`, C.brand);

    /* ════════════════════════════════════════════════════════
       SHEET 2 — TIMELINE
       ════════════════════════════════════════════════════════ */
    if (chartData.length > 0) {
      const ws = wb.addWorksheet("Timeline", { properties: { tabColor: { argb: C.accent } } });
      setupSheet(ws, 12);
      let row = 2;
      row = titleBar(ws, row, 12, "Activity Timeline", "Profile views and saves over the selected period");
      row = sectionHeader(ws, row, 12, "Time series");
      tableHeader(ws, row, 2, ["Period", "Profile Views", "vCard Saves"]);
      // Span period over B-D, views E-H, saves I-L
      const headerRow = row;
      ws.mergeCells(headerRow, 2, headerRow, 4);
      ws.mergeCells(headerRow, 5, headerRow, 8);
      ws.mergeCells(headerRow, 9, headerRow, 12);
      row++;
      const dataStart = row;
      chartData.forEach((p, i) => {
        const rr = ws.getRow(row);
        ws.mergeCells(row, 2, row, 4);
        ws.mergeCells(row, 5, row, 8);
        ws.mergeCells(row, 9, row, 12);
        rr.getCell(2).value = p.label;
        rr.getCell(5).value = p.taps;
        rr.getCell(9).value = p.vcards;
        styleBodyRow(ws, row, 2, 12, i % 2 === 0);
        rr.getCell(2).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
        rr.getCell(5).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
        rr.getCell(9).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
        row++;
      });
      addDataBar(ws, `E${dataStart}:H${row - 1}`, C.brand);
      addDataBar(ws, `I${dataStart}:L${row - 1}`, C.accent);
    }

    /* ════════════════════════════════════════════════════════
       SHEET 3 — DEVICES (Device / Browser / OS)
       ════════════════════════════════════════════════════════ */
    const breakdowns = [
      { data: stats.deviceBreakdown, title: "Device type", color: C.brand },
      { data: stats.browserBreakdown, title: "Browser", color: C.accent },
      { data: stats.osBreakdown, title: "Operating system", color: C.warn },
    ].filter((b) => b.data.length > 0);

    if (breakdowns.length > 0) {
      const ws = wb.addWorksheet("Devices", { properties: { tabColor: { argb: C.warn } } });
      setupSheet(ws, 12);
      let row = 2;
      row = titleBar(ws, row, 12, "Technical Breakdown", "Visitor environment distribution");

      breakdowns.forEach((b) => {
        row = sectionHeader(ws, row, 12, b.title);
        tableHeader(ws, row, 2, ["Name", "Count", "Share", "Distribution"]);
        ws.mergeCells(row, 2, row, 4);
        ws.mergeCells(row, 5, row, 6);
        ws.mergeCells(row, 7, row, 8);
        ws.mergeCells(row, 9, row, 12);
        row++;
        const total = b.data.reduce((s, d) => s + d.value, 0);
        const dataStart = row;
        b.data.forEach((d, i) => {
          ws.mergeCells(row, 2, row, 4);
          ws.mergeCells(row, 5, row, 6);
          ws.mergeCells(row, 7, row, 8);
          ws.mergeCells(row, 9, row, 12);
          const rr = ws.getRow(row);
          rr.getCell(2).value = d.name;
          rr.getCell(5).value = d.value;
          rr.getCell(7).value = total > 0 ? d.value / total : 0;
          rr.getCell(7).numFmt = "0.0%";
          rr.getCell(9).value = d.value;
          styleBodyRow(ws, row, 2, 12, i % 2 === 0);
          rr.getCell(2).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
          rr.getCell(5).alignment = { vertical: "middle", horizontal: "right", indent: 1 };
          rr.getCell(7).alignment = { vertical: "middle", horizontal: "right", indent: 1 };
          rr.getCell(9).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
          row++;
        });
        addDataBar(ws, `I${dataStart}:L${row - 1}`, b.color);
        row += 1;
      });
    }

    /* ════════════════════════════════════════════════════════
       SHEET 4 — ENGAGEMENT (Links + CTAs)
       ════════════════════════════════════════════════════════ */
    if (stats.linkCTR.length > 0 || stats.ctaClicks.length > 0) {
      const ws = wb.addWorksheet("Engagement", { properties: { tabColor: { argb: C.success } } });
      setupSheet(ws, 12);
      let row = 2;
      row = titleBar(ws, row, 12, "Engagement", "Click-throughs and call-to-action performance");

      if (stats.linkCTR.length > 0) {
        row = sectionHeader(ws, row, 12, "Link click-through rates");
        tableHeader(ws, row, 2, ["Link", "Clicks", "CTR", "Performance"]);
        ws.mergeCells(row, 2, row, 4);
        ws.mergeCells(row, 5, row, 6);
        ws.mergeCells(row, 7, row, 8);
        ws.mergeCells(row, 9, row, 12);
        row++;
        const dataStart = row;
        stats.linkCTR.forEach((l, i) => {
          ws.mergeCells(row, 2, row, 4);
          ws.mergeCells(row, 5, row, 6);
          ws.mergeCells(row, 7, row, 8);
          ws.mergeCells(row, 9, row, 12);
          const rr = ws.getRow(row);
          rr.getCell(2).value = l.name;
          rr.getCell(5).value = l.clicks;
          rr.getCell(7).value = l.percentage / 100;
          rr.getCell(7).numFmt = "0.0%";
          rr.getCell(9).value = l.clicks;
          styleBodyRow(ws, row, 2, 12, i % 2 === 0);
          rr.getCell(2).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
          rr.getCell(5).alignment = { vertical: "middle", horizontal: "right", indent: 1 };
          rr.getCell(7).alignment = { vertical: "middle", horizontal: "right", indent: 1 };
          rr.getCell(9).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
          row++;
        });
        addDataBar(ws, `I${dataStart}:L${row - 1}`, C.brand);
        row += 1;
      }

      if (stats.ctaClicks.length > 0) {
        row = sectionHeader(ws, row, 12, "CTA clicks");
        tableHeader(ws, row, 2, ["Label", "Clicks", "Performance"]);
        ws.mergeCells(row, 2, row, 5);
        ws.mergeCells(row, 6, row, 8);
        ws.mergeCells(row, 9, row, 12);
        row++;
        const dataStart = row;
        stats.ctaClicks.forEach((c, i) => {
          ws.mergeCells(row, 2, row, 5);
          ws.mergeCells(row, 6, row, 8);
          ws.mergeCells(row, 9, row, 12);
          const rr = ws.getRow(row);
          rr.getCell(2).value = c.label;
          rr.getCell(6).value = c.clicks;
          rr.getCell(9).value = c.clicks;
          styleBodyRow(ws, row, 2, 12, i % 2 === 0);
          rr.getCell(2).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
          rr.getCell(6).alignment = { vertical: "middle", horizontal: "right", indent: 1 };
          rr.getCell(9).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
          row++;
        });
        addDataBar(ws, `I${dataStart}:L${row - 1}`, C.success);
      }
    }

    /* ════════════════════════════════════════════════════════
       SHEET 5 — CONNECTIONS
       ════════════════════════════════════════════════════════ */
    {
      const ws = wb.addWorksheet("Connections", { properties: { tabColor: { argb: C.muted } } });
      setupSheet(ws, 12);
      let row = 2;
      row = titleBar(ws, row, 12, "Connection Sources", "How visitors reached your profile");
      row = sectionHeader(ws, row, 12, "Source breakdown");
      tableHeader(ws, row, 2, ["Source", "Count", "Distribution"]);
      ws.mergeCells(row, 2, row, 5);
      ws.mergeCells(row, 6, row, 8);
      ws.mergeCells(row, 9, row, 12);
      row++;
      const conn = [
        { name: "NFC Tap", value: stats.connectionSources.nfc },
        { name: "QR Scan", value: stats.connectionSources.qr },
        { name: "Direct Link", value: stats.connectionSources.direct },
      ];
      const dataStart = row;
      conn.forEach((c, i) => {
        ws.mergeCells(row, 2, row, 5);
        ws.mergeCells(row, 6, row, 8);
        ws.mergeCells(row, 9, row, 12);
        const rr = ws.getRow(row);
        rr.getCell(2).value = c.name;
        rr.getCell(6).value = c.value;
        rr.getCell(9).value = c.value;
        styleBodyRow(ws, row, 2, 12, i % 2 === 0);
        rr.getCell(2).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
        rr.getCell(6).alignment = { vertical: "middle", horizontal: "right", indent: 1 };
        rr.getCell(9).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
        row++;
      });
      addDataBar(ws, `I${dataStart}:L${row - 1}`, C.accent);
    }

    /* ════════════════════════════════════════════════════════
       SHEET 6 — PERSONAS
       ════════════════════════════════════════════════════════ */
    if (stats.personaPerformance.length > 0) {
      const ws = wb.addWorksheet("Personas", { properties: { tabColor: { argb: C.brand } } });
      setupSheet(ws, 12);
      let row = 2;
      row = titleBar(ws, row, 12, "Persona Performance", "Engagement broken down per active identity");
      row = sectionHeader(ws, row, 12, "Per-persona metrics");
      tableHeader(ws, row, 2, ["Persona", "Views", "Save Rate", "Performance"]);
      ws.mergeCells(row, 2, row, 4);
      ws.mergeCells(row, 5, row, 6);
      ws.mergeCells(row, 7, row, 8);
      ws.mergeCells(row, 9, row, 12);
      row++;
      const dataStart = row;
      stats.personaPerformance.forEach((p, i) => {
        ws.mergeCells(row, 2, row, 4);
        ws.mergeCells(row, 5, row, 6);
        ws.mergeCells(row, 7, row, 8);
        ws.mergeCells(row, 9, row, 12);
        const rr = ws.getRow(row);
        rr.getCell(2).value = p.name;
        rr.getCell(5).value = p.taps;
        rr.getCell(7).value = p.saveRate / 100;
        rr.getCell(7).numFmt = "0.0%";
        rr.getCell(9).value = p.taps;
        styleBodyRow(ws, row, 2, 12, i % 2 === 0);
        rr.getCell(2).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
        rr.getCell(5).alignment = { vertical: "middle", horizontal: "right", indent: 1 };
        rr.getCell(7).alignment = { vertical: "middle", horizontal: "right", indent: 1 };
        rr.getCell(9).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
        row++;
      });
      addDataBar(ws, `I${dataStart}:L${row - 1}`, C.brand);
    }

    /* ════════════════════════════════════════════════════════
       SHEET 7 — TAP VELOCITY
       ════════════════════════════════════════════════════════ */
    if (stats.tapVelocity.length > 0) {
      const ws = wb.addWorksheet("Tap Velocity", { properties: { tabColor: { argb: C.warn } } });
      setupSheet(ws, 12);
      let row = 2;
      row = titleBar(ws, row, 12, "Tap Velocity", "Hourly tap intensity with peak detection");
      row = sectionHeader(ws, row, 12, "Hourly cadence");
      tableHeader(ws, row, 2, ["Time", "Taps", "Trend"]);
      ws.mergeCells(row, 2, row, 5);
      ws.mergeCells(row, 6, row, 8);
      ws.mergeCells(row, 9, row, 12);
      row++;
      const dataStart = row;
      stats.tapVelocity.forEach((t, i) => {
        ws.mergeCells(row, 2, row, 5);
        ws.mergeCells(row, 6, row, 8);
        ws.mergeCells(row, 9, row, 12);
        const rr = ws.getRow(row);
        rr.getCell(2).value = t.label;
        rr.getCell(6).value = t.taps;
        rr.getCell(9).value = t.taps;
        styleBodyRow(ws, row, 2, 12, i % 2 === 0);
        rr.getCell(2).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
        rr.getCell(6).alignment = { vertical: "middle", horizontal: "right", indent: 1 };
        rr.getCell(9).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
        row++;
      });
      addDataBar(ws, `I${dataStart}:L${row - 1}`, C.warn);

      const peak = stats.tapVelocity.reduce((m, d) => (d.taps > m.taps ? d : m), stats.tapVelocity[0]);
      row += 1;
      ws.mergeCells(row, 2, row, 12);
      const pc = ws.getCell(row, 2);
      pc.value = `⚡ Peak — ${peak.taps} taps at ${peak.label}`;
      pc.font = { name: FONT, size: 11, bold: true, color: { argb: C.warn } };
      pc.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      ws.getRow(row).height = 26;
    }

    /* ════════════════════════════════════════════════════════
       SHEET 8 — SECURITY
       ════════════════════════════════════════════════════════ */
    {
      const ws = wb.addWorksheet("Security", { properties: { tabColor: { argb: C.danger } } });
      setupSheet(ws, 12);
      let row = 2;
      row = titleBar(ws, row, 12, "Security & Trust", "Authentication and access integrity");

      summaryCard(ws, row, 2, "Auth Success Rate", `${stats.authSuccessRate}%`, C.success);
      summaryCard(ws, row, 6, "Unauthorized Attempts", stats.unauthorizedAttempts, C.danger);
      summaryCard(ws, row, 10, "Avg Dwell Time", `${stats.avgDwellTime}s`, C.brand);
      row += 5;

      row = sectionHeader(ws, row, 12, "Detail");
      tableHeader(ws, row, 2, ["Metric", "Value"]);
      ws.mergeCells(row, 2, row, 7);
      ws.mergeCells(row, 8, row, 12);
      row++;
      const items: [string, string | number][] = [
        ["Auth Success Rate", `${stats.authSuccessRate}%`],
        ["Unauthorized Attempts", stats.unauthorizedAttempts],
        ["Avg Dwell Time (s)", stats.avgDwellTime],
        ["Leads Captured", stats.leadGenCount],
      ];
      items.forEach(([m, v], i) => {
        ws.mergeCells(row, 2, row, 7);
        ws.mergeCells(row, 8, row, 12);
        const rr = ws.getRow(row);
        rr.getCell(2).value = m;
        rr.getCell(8).value = v;
        styleBodyRow(ws, row, 2, 12, i % 2 === 0);
        rr.getCell(2).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
        rr.getCell(8).alignment = { vertical: "middle", horizontal: "right", indent: 1 };
        row++;
      });
    }

    /* ════════════════════════════════════════════════════════
       SHEET 9 — ANALYTICS REPORT (rendered chart images)
       ════════════════════════════════════════════════════════ */
    {
      const ws = wb.addWorksheet("Analytics Report", {
        properties: { tabColor: { argb: C.ink } },
      });
      setupSheet(ws, 14);
      let row = 2;
      row = titleBar(
        ws,
        row,
        14,
        "NFC Platform Performance Report",
        "Visualised pulse and source distribution",
      );

      // Helper — hex ARGB → CSS rgba
      const css = (argb: string, alpha = 1) => {
        const h = argb.replace(/^FF/, "");
        const r = parseInt(h.slice(0, 2), 16);
        const g = parseInt(h.slice(2, 4), 16);
        const b = parseInt(h.slice(4, 6), 16);
        return `rgba(${r},${g},${b},${alpha})`;
      };

      // Chart 1 — Smooth line: Daily Profile Views (taps over time)
      const drawLineChart = (data: { label: string; value: number }[]): string => {
        const W = 1000;
        const H = 500;
        const cv = document.createElement("canvas");
        cv.width = W;
        cv.height = H;
        const ctx = cv.getContext("2d")!;
        // Background
        ctx.fillStyle = css(C.white);
        ctx.fillRect(0, 0, W, H);
        // Title
        ctx.fillStyle = css(C.ink);
        ctx.font = "bold 22px Inter, system-ui, sans-serif";
        ctx.fillText("Daily Taps / Interactions", 32, 40);
        ctx.font = "12px Inter, system-ui, sans-serif";
        ctx.fillStyle = css(C.muted);
        ctx.fillText("Smoothed pulse across the selected period", 32, 62);

        const padL = 60, padR = 32, padT = 90, padB = 60;
        const cw = W - padL - padR;
        const ch = H - padT - padB;
        const max = Math.max(1, ...data.map((d) => d.value));
        const stepX = data.length > 1 ? cw / (data.length - 1) : cw;

        // Grid
        ctx.strokeStyle = css(C.line);
        ctx.lineWidth = 1;
        ctx.font = "11px Inter, system-ui, sans-serif";
        ctx.fillStyle = css(C.muted);
        for (let i = 0; i <= 4; i++) {
          const y = padT + (ch / 4) * i;
          ctx.beginPath();
          ctx.moveTo(padL, y);
          ctx.lineTo(W - padR, y);
          ctx.stroke();
          const v = Math.round(max - (max / 4) * i);
          ctx.fillText(String(v), 8, y + 4);
        }

        // X labels (every Nth)
        const skip = Math.max(1, Math.floor(data.length / 8));
        data.forEach((d, i) => {
          if (i % skip !== 0 && i !== data.length - 1) return;
          const x = padL + stepX * i;
          ctx.fillStyle = css(C.muted);
          ctx.fillText(d.label, x - 14, H - padB + 18);
        });

        // Smooth path (Catmull-Rom → Bezier)
        const points = data.map((d, i) => ({
          x: padL + stepX * i,
          y: padT + ch - (d.value / max) * ch,
        }));
        if (points.length >= 2) {
          // Gradient fill under curve
          const grad = ctx.createLinearGradient(0, padT, 0, padT + ch);
          grad.addColorStop(0, css(C.brand, 0.35));
          grad.addColorStop(1, css(C.brand, 0));
          ctx.beginPath();
          ctx.moveTo(points[0].x, padT + ch);
          ctx.lineTo(points[0].x, points[0].y);
          for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i - 1] || points[i];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[i + 2] || p2;
            const t = 0.4;
            const cp1x = p1.x + ((p2.x - p0.x) / 6) * (1 + t);
            const cp1y = p1.y + ((p2.y - p0.y) / 6) * (1 + t);
            const cp2x = p2.x - ((p3.x - p1.x) / 6) * (1 + t);
            const cp2y = p2.y - ((p3.y - p1.y) / 6) * (1 + t);
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
          }
          ctx.lineTo(points[points.length - 1].x, padT + ch);
          ctx.closePath();
          ctx.fillStyle = grad;
          ctx.fill();

          // Stroke
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i - 1] || points[i];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[i + 2] || p2;
            const t = 0.4;
            const cp1x = p1.x + ((p2.x - p0.x) / 6) * (1 + t);
            const cp1y = p1.y + ((p2.y - p0.y) / 6) * (1 + t);
            const cp2x = p2.x - ((p3.x - p1.x) / 6) * (1 + t);
            const cp2y = p2.y - ((p3.y - p1.y) / 6) * (1 + t);
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
          }
          ctx.strokeStyle = css(C.brand);
          ctx.lineWidth = 3;
          ctx.lineJoin = "round";
          ctx.stroke();

          // Dots
          ctx.fillStyle = css(C.brand);
          points.forEach((p) => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
          });
        }

        return cv.toDataURL("image/png");
      };

      // Chart 2 — Donut/Pie: traffic source distribution
      const drawPieChart = (
        data: { name: string; value: number }[],
        title: string,
      ): string => {
        const W = 700;
        const H = 500;
        const cv = document.createElement("canvas");
        cv.width = W;
        cv.height = H;
        const ctx = cv.getContext("2d")!;
        ctx.fillStyle = css(C.white);
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = css(C.ink);
        ctx.font = "bold 22px Inter, system-ui, sans-serif";
        ctx.fillText(title, 32, 40);
        ctx.font = "12px Inter, system-ui, sans-serif";
        ctx.fillStyle = css(C.muted);
        ctx.fillText("Share of overall visitor connections", 32, 62);

        const cx = 220, cy = 280, rOuter = 150, rInner = 85;
        const total = data.reduce((s, d) => s + d.value, 0) || 1;
        const palette = [C.brand, C.accent, C.warn, C.success, C.danger, C.muted];

        let start = -Math.PI / 2;
        data.forEach((d, i) => {
          const angle = (d.value / total) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, rOuter, start, start + angle);
          ctx.closePath();
          ctx.fillStyle = css(palette[i % palette.length]);
          ctx.fill();
          start += angle;
        });

        // Donut hole
        ctx.beginPath();
        ctx.arc(cx, cy, rInner, 0, Math.PI * 2);
        ctx.fillStyle = css(C.white);
        ctx.fill();

        // Centre total
        ctx.fillStyle = css(C.ink);
        ctx.font = "bold 28px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(String(total), cx, cy + 4);
        ctx.font = "11px Inter, system-ui, sans-serif";
        ctx.fillStyle = css(C.muted);
        ctx.fillText("Total", cx, cy + 24);
        ctx.textAlign = "left";

        // Legend
        const lx = 420;
        let ly = 160;
        ctx.font = "12px Inter, system-ui, sans-serif";
        data.forEach((d, i) => {
          ctx.fillStyle = css(palette[i % palette.length]);
          ctx.fillRect(lx, ly, 14, 14);
          ctx.fillStyle = css(C.ink);
          const pct = ((d.value / total) * 100).toFixed(1);
          ctx.fillText(`${d.name}`, lx + 22, ly + 11);
          ctx.fillStyle = css(C.muted);
          ctx.fillText(`${d.value}  ·  ${pct}%`, lx + 22, ly + 28);
          ly += 44;
        });

        return cv.toDataURL("image/png");
      };

      // Inject line chart
      if (chartData.length > 0) {
        row = sectionHeader(ws, row, 14, "Card pulse");
        const lineImg = drawLineChart(
          chartData.map((d) => ({ label: d.label, value: d.taps })),
        );
        const lineId = wb.addImage({
          base64: lineImg.split(",")[1],
          extension: "png",
        });
        ws.addImage(lineId, {
          tl: { col: 1, row: row - 1 },
          ext: { width: 900, height: 360 },
        });
        // Reserve space (~18 rows of 22px)
        for (let i = 0; i < 18; i++) ws.getRow(row + i).height = 22;
        row += 19;
      }

      // Pie chart — connection sources
      const sourceData = [
        { name: "NFC Tap", value: stats.connectionSources.nfc },
        { name: "QR Scan", value: stats.connectionSources.qr },
        { name: "Direct Link", value: stats.connectionSources.direct },
      ].filter((d) => d.value > 0);

      if (sourceData.length > 0) {
        row = sectionHeader(ws, row, 14, "Traffic sources");
        const pieImg = drawPieChart(sourceData, "Connection Source Distribution");
        const pieId = wb.addImage({
          base64: pieImg.split(",")[1],
          extension: "png",
        });
        ws.addImage(pieId, {
          tl: { col: 1, row: row - 1 },
          ext: { width: 640, height: 360 },
        });
        for (let i = 0; i < 18; i++) ws.getRow(row + i).height = 22;
        row += 19;
      }
    }

    /* ─── Export ──────────────────────────────────────────── */
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `handshake-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={handleExport}>
      <Download className="w-3 h-3" />
      Export XLSX
    </Button>
  );
}
