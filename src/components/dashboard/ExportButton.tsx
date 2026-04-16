import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { NfcStats } from "@/hooks/useNfcData";

interface ExportButtonProps {
  stats: NfcStats;
  chartData: { label: string; taps: number; vcards: number }[];
}

const CHART_COLORS = ["0D9488", "F97316", "8B5CF6", "EF4444", "3B82F6", "EC4899", "F59E0B", "10B981"];

function addPieChart(ws: any, title: string, dataRange: string, labelRange: string, anchor: { col: number; row: number }) {
  ws.addImage?.(undefined); // no-op, just checking API
  // ExcelJS doesn't have native chart support — we'll use a workaround with a chart worksheet
}

export function ExportButton({ stats, chartData }: ExportButtonProps) {
  const handleExport = async () => {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "Handshake";
    wb.created = new Date();

    const headerFont = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    const headerFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF0D9488" } };
    const sectionFont = { bold: true, size: 11, color: { argb: "FF0D9488" } };
    const borderThin = {
      top: { style: "thin" as const }, bottom: { style: "thin" as const },
      left: { style: "thin" as const }, right: { style: "thin" as const },
    };
    const accentFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFF0FDFA" } };

    const applyHeader = (ws: any, row: number, cols: number) => {
      const r = ws.getRow(row);
      for (let c = 1; c <= cols; c++) {
        const cell = r.getCell(c);
        cell.font = headerFont;
        cell.fill = headerFill;
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = borderThin;
      }
      r.height = 24;
    };

    const autoWidth = (ws: any) => {
      ws.columns?.forEach((col: any) => {
        let maxLen = 12;
        col.eachCell?.({ includeEmpty: false }, (cell: any) => {
          const len = String(cell.value ?? "").length;
          if (len > maxLen) maxLen = len;
        });
        col.width = Math.min(maxLen + 4, 40);
      });
    };

    const addBar = (ws: any, row: number, col: number, value: number, max: number, width: number = 20) => {
      const bars = max > 0 ? Math.round((value / max) * width) : 0;
      const cell = ws.getRow(row).getCell(col);
      cell.value = "█".repeat(bars) + "░".repeat(width - bars);
      cell.font = { size: 9, color: { argb: "FF0D9488" } };
    };

    // Helper: render a visual pie chart using block characters in cells
    const renderVisualPie = (ws: any, startRow: number, startCol: number, data: { name: string; value: number }[], title: string) => {
      const total = data.reduce((s, d) => s + d.value, 0);
      if (total === 0) return startRow;

      ws.getRow(startRow).getCell(startCol).value = title;
      ws.getRow(startRow).getCell(startCol).font = { bold: true, size: 12, color: { argb: "FF0D9488" } };
      startRow++;

      // Pie segments as percentage bars
      ws.getRow(startRow).getCell(startCol).value = "Segment";
      ws.getRow(startRow).getCell(startCol + 1).value = "Count";
      ws.getRow(startRow).getCell(startCol + 2).value = "Share";
      ws.getRow(startRow).getCell(startCol + 3).value = "Chart";
      for (let c = startCol; c <= startCol + 3; c++) {
        const cell = ws.getRow(startRow).getCell(c);
        cell.font = headerFont;
        cell.fill = headerFill;
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = borderThin;
      }
      startRow++;

      const pieChars = ["🟢", "🟠", "🟣", "🔴", "🔵", "🩷", "🟡", "⚪"];
      data.forEach((d, i) => {
        const pct = total > 0 ? d.value / total : 0;
        const blocks = Math.round(pct * 30);
        const symbol = pieChars[i % pieChars.length];
        const r = ws.getRow(startRow);
        r.getCell(startCol).value = `${symbol} ${d.name}`;
        r.getCell(startCol).border = borderThin;
        r.getCell(startCol + 1).value = d.value;
        r.getCell(startCol + 1).border = borderThin;
        r.getCell(startCol + 1).alignment = { horizontal: "right" };
        r.getCell(startCol + 2).value = pct;
        r.getCell(startCol + 2).numFmt = "0.0%";
        r.getCell(startCol + 2).border = borderThin;
        r.getCell(startCol + 3).value = "█".repeat(blocks) + "░".repeat(30 - blocks);
        r.getCell(startCol + 3).font = { size: 9, color: { argb: `FF${CHART_COLORS[i % CHART_COLORS.length]}` } };
        r.getCell(startCol + 3).border = borderThin;
        if (i % 2 === 0) {
          for (let c = startCol; c <= startCol + 3; c++) r.getCell(c).fill = accentFill;
        }
        startRow++;
      });

      // Donut visual ring
      startRow++;
      const ringSize = 9;
      const mid = Math.floor(ringSize / 2);
      let segments: string[] = [];
      data.forEach((d, idx) => {
        const count = Math.max(1, Math.round((d.value / total) * (ringSize * 4 - 4)));
        for (let s = 0; s < count; s++) segments.push(pieChars[idx % pieChars.length]);
      });
      while (segments.length < ringSize * 4 - 4) segments.push("⬜");
      segments = segments.slice(0, ringSize * 4 - 4);

      // Render ring as a square outline
      let idx = 0;
      for (let row = 0; row < ringSize; row++) {
        const r = ws.getRow(startRow + row);
        for (let col = 0; col < ringSize; col++) {
          const isEdge = row === 0 || row === ringSize - 1 || col === 0 || col === ringSize - 1;
          const isMid = row === mid && col === mid;
          if (isMid) {
            r.getCell(startCol + col).value = `${total}`;
            r.getCell(startCol + col).font = { bold: true, size: 10, color: { argb: "FF0D9488" } };
            r.getCell(startCol + col).alignment = { horizontal: "center" };
          } else if (isEdge && idx < segments.length) {
            r.getCell(startCol + col).value = segments[idx];
            r.getCell(startCol + col).alignment = { horizontal: "center" };
            idx++;
          }
        }
      }
      startRow += ringSize + 1;
      return startRow;
    };

    // Helper: render line chart using bar characters per row
    const renderLineChart = (ws: any, startRow: number, startCol: number, data: { label: string; value: number }[], title: string) => {
      if (data.length === 0) return startRow;

      ws.getRow(startRow).getCell(startCol).value = title;
      ws.getRow(startRow).getCell(startCol).font = { bold: true, size: 12, color: { argb: "FF0D9488" } };
      startRow++;

      ws.getRow(startRow).getCell(startCol).value = "Time";
      ws.getRow(startRow).getCell(startCol + 1).value = "Taps";
      ws.getRow(startRow).getCell(startCol + 2).value = "Trend";
      for (let c = startCol; c <= startCol + 2; c++) {
        const cell = ws.getRow(startRow).getCell(c);
        cell.font = headerFont;
        cell.fill = headerFill;
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = borderThin;
      }
      startRow++;

      const maxVal = Math.max(...data.map(d => d.value), 1);
      data.forEach((d, i) => {
        const r = ws.getRow(startRow);
        r.getCell(startCol).value = d.label;
        r.getCell(startCol).border = borderThin;
        r.getCell(startCol + 1).value = d.value;
        r.getCell(startCol + 1).border = borderThin;
        r.getCell(startCol + 1).alignment = { horizontal: "right" };
        const bars = Math.round((d.value / maxVal) * 30);
        r.getCell(startCol + 2).value = "▓".repeat(bars) + "░".repeat(30 - bars);
        r.getCell(startCol + 2).font = { size: 9, color: { argb: "FF3B82F6" } };
        r.getCell(startCol + 2).border = borderThin;
        if (i % 2 === 0) {
          for (let c = startCol; c <= startCol + 2; c++) r.getCell(c).fill = accentFill;
        }
        startRow++;
      });

      // Peak detection
      if (data.length > 0) {
        const peak = data.reduce((max, d) => d.value > max.value ? d : max, data[0]);
        startRow++;
        const r = ws.getRow(startRow);
        r.getCell(startCol).value = "⚡ Peak:";
        r.getCell(startCol).font = { bold: true, color: { argb: "FFF97316" } };
        r.getCell(startCol + 1).value = `${peak.value} taps at ${peak.label}`;
        r.getCell(startCol + 1).font = { italic: true, color: { argb: "FFF97316" } };
        startRow++;
      }

      return startRow;
    };

    // ═══ OVERVIEW ═══
    const wsO = wb.addWorksheet("Overview");
    wsO.mergeCells("A1:C1");
    wsO.getCell("A1").value = "HANDSHAKE — ANALYTICS REPORT";
    wsO.getCell("A1").font = { bold: true, size: 16, color: { argb: "FF0D9488" } };
    wsO.getCell("A1").alignment = { horizontal: "center" };
    wsO.getRow(2).values = ["", `Generated: ${new Date().toLocaleString()}`];
    wsO.getRow(2).font = { size: 9, italic: true, color: { argb: "FF999999" } };
    wsO.addRow([]);

    wsO.addRow(["KEY PERFORMANCE INDICATORS"]).font = sectionFont;
    wsO.addRow(["Metric", "Value", "Visual"]);
    applyHeader(wsO, 5, 3);

    const kpis: [string, string | number][] = [
      ["Total Profile Views", stats.totalTaps],
      ["Unique Visitors", stats.uniqueVisitors],
      ["Return Visitor Rate", `${stats.returnVisitorRate}%`],
      ["Interaction Depth", `${stats.interactionDepthRate}%`],
      ["Contact Save Rate", `${stats.contactSaveRate}%`],
      ["Avg Dwell Time", `${stats.avgDwellTime}s`],
      ["vCard Downloads", stats.vcardDownloads],
      ["CV Downloads", stats.cvDownloads],
      ["Card Flips", stats.cardFlips],
      ["Video Plays", stats.videoPlays],
      ["Contact Forms", stats.contactFormSubmissions],
      ["Leads Captured", stats.leadGenCount],
    ];
    const maxKpi = Math.max(...kpis.map(([, v]) => typeof v === "number" ? v : parseFloat(String(v)) || 0));
    kpis.forEach(([m, v], i) => {
      const rowNum = 6 + i;
      const r = wsO.getRow(rowNum);
      r.values = [m, v];
      r.getCell(1).border = borderThin;
      r.getCell(2).border = borderThin;
      r.getCell(2).alignment = { horizontal: "right" };
      r.getCell(3).border = borderThin;
      if (i % 2 === 0) { r.getCell(1).fill = accentFill; r.getCell(2).fill = accentFill; r.getCell(3).fill = accentFill; }
      const numVal = typeof v === "number" ? v : parseFloat(String(v)) || 0;
      addBar(wsO, rowNum, 3, numVal, maxKpi, 15);
    });
    autoWidth(wsO);

    // ═══ CHARTS ═══
    const wsCharts = wb.addWorksheet("Charts");
    wsCharts.mergeCells("A1:D1");
    wsCharts.getCell("A1").value = "VISUAL ANALYTICS";
    wsCharts.getCell("A1").font = { bold: true, size: 16, color: { argb: "FF0D9488" } };
    wsCharts.getCell("A1").alignment = { horizontal: "center" };
    let chartRow = 3;

    // Persona pie
    if (stats.personaPerformance.length > 0) {
      chartRow = renderVisualPie(wsCharts, chartRow, 1, stats.personaPerformance.map(p => ({ name: p.name, value: p.taps })), "📊 TAPS BY PERSONA");
      chartRow++;
    }

    // Device pie
    if (stats.deviceBreakdown.length > 0) {
      chartRow = renderVisualPie(wsCharts, chartRow, 1, stats.deviceBreakdown, "📱 DEVICE TYPE DISTRIBUTION");
      chartRow++;
    }

    // Browser pie
    if (stats.browserBreakdown.length > 0) {
      chartRow = renderVisualPie(wsCharts, chartRow, 1, stats.browserBreakdown, "🌐 BROWSER DISTRIBUTION");
      chartRow++;
    }

    // OS pie
    if (stats.osBreakdown.length > 0) {
      chartRow = renderVisualPie(wsCharts, chartRow, 1, stats.osBreakdown, "💻 OPERATING SYSTEM DISTRIBUTION");
      chartRow++;
    }

    // Connection source pie
    const connPieData = [
      { name: "NFC Tap", value: stats.connectionSources.nfc },
      { name: "QR Scan", value: stats.connectionSources.qr },
      { name: "Direct Link", value: stats.connectionSources.direct },
    ].filter(d => d.value > 0);
    if (connPieData.length > 0) {
      chartRow = renderVisualPie(wsCharts, chartRow, 1, connPieData, "🔗 CONNECTION SOURCE");
      chartRow++;
    }

    // Tap Velocity line chart
    if (stats.tapVelocity.length > 0) {
      chartRow = renderLineChart(wsCharts, chartRow, 1, stats.tapVelocity.map(t => ({ label: t.label, value: t.taps })), "⚡ TAP VELOCITY (TAPS/HOUR)");
    }

    autoWidth(wsCharts);

    // ═══ TIMELINE ═══
    if (chartData.length > 0) {
      const wsTl = wb.addWorksheet("Timeline");
      wsTl.addRow(["ACTIVITY TIMELINE"]).font = sectionFont;
      wsTl.addRow(["Period", "Profile Views", "vCard Saves", "Views Bar", "Saves Bar"]);
      applyHeader(wsTl, 2, 5);
      const maxTaps = Math.max(...chartData.map((p) => p.taps));
      const maxVcards = Math.max(...chartData.map((p) => p.vcards));
      chartData.forEach((p, i) => {
        const rowNum = 3 + i;
        const r = wsTl.getRow(rowNum);
        r.values = [p.label, p.taps, p.vcards];
        r.eachCell((c: any) => { c.border = borderThin; });
        if (i % 2 === 0) r.eachCell((c: any) => { c.fill = accentFill; });
        addBar(wsTl, rowNum, 4, p.taps, maxTaps);
        addBar(wsTl, rowNum, 5, p.vcards, maxVcards);
      });
      autoWidth(wsTl);
    }

    // ═══ DEVICES ═══
    const breakdowns = [
      { data: stats.deviceBreakdown, title: "DEVICE BREAKDOWN" },
      { data: stats.browserBreakdown, title: "BROWSER BREAKDOWN" },
      { data: stats.osBreakdown, title: "OS BREAKDOWN" },
    ].filter((b) => b.data.length > 0);

    if (breakdowns.length > 0) {
      const wsDev = wb.addWorksheet("Devices");
      let row = 1;
      breakdowns.forEach((b) => {
        wsDev.getRow(row).values = [b.title];
        wsDev.getRow(row).font = sectionFont;
        row++;
        wsDev.getRow(row).values = ["Name", "Count", "Share", "Distribution"];
        applyHeader(wsDev, row, 4);
        row++;
        const total = b.data.reduce((s, d) => s + d.value, 0);
        const max = Math.max(...b.data.map((d) => d.value));
        b.data.forEach((d, i) => {
          const r = wsDev.getRow(row);
          r.values = [d.name, d.value, total > 0 ? d.value / total : 0];
          r.getCell(3).numFmt = "0.0%";
          r.eachCell((c: any) => { c.border = borderThin; });
          if (i % 2 === 0) r.eachCell((c: any) => { c.fill = accentFill; });
          addBar(wsDev, row, 4, d.value, max);
          row++;
        });
        row += 2;
      });
      autoWidth(wsDev);
    }

    // ═══ ENGAGEMENT ═══
    if (stats.linkCTR.length > 0 || stats.ctaClicks.length > 0) {
      const wsEng = wb.addWorksheet("Engagement");
      let row = 1;
      if (stats.linkCTR.length > 0) {
        wsEng.getRow(row).values = ["LINK CLICK-THROUGH RATES"];
        wsEng.getRow(row).font = sectionFont;
        row++;
        wsEng.getRow(row).values = ["Link", "Clicks", "CTR", "Performance"];
        applyHeader(wsEng, row, 4);
        row++;
        const maxC = Math.max(...stats.linkCTR.map((l) => l.clicks));
        stats.linkCTR.forEach((l, i) => {
          const r = wsEng.getRow(row);
          r.values = [l.name, l.clicks, l.percentage / 100];
          r.getCell(3).numFmt = "0.0%";
          r.eachCell((c: any) => { c.border = borderThin; });
          if (i % 2 === 0) r.eachCell((c: any) => { c.fill = accentFill; });
          addBar(wsEng, row, 4, l.clicks, maxC);
          row++;
        });
        row += 2;
      }
      if (stats.ctaClicks.length > 0) {
        wsEng.getRow(row).values = ["CTA CLICKS"];
        wsEng.getRow(row).font = sectionFont;
        row++;
        wsEng.getRow(row).values = ["Label", "Clicks", "Bar"];
        applyHeader(wsEng, row, 3);
        row++;
        const maxC = Math.max(...stats.ctaClicks.map((c) => c.clicks));
        stats.ctaClicks.forEach((c, i) => {
          const r = wsEng.getRow(row);
          r.values = [c.label, c.clicks];
          r.eachCell((ce: any) => { ce.border = borderThin; });
          if (i % 2 === 0) r.eachCell((ce: any) => { ce.fill = accentFill; });
          addBar(wsEng, row, 3, c.clicks, maxC);
          row++;
        });
      }
      autoWidth(wsEng);
    }

    // ═══ CONNECTIONS ═══
    const wsConn = wb.addWorksheet("Connections");
    wsConn.addRow(["CONNECTION SOURCES"]).font = sectionFont;
    wsConn.addRow(["Source", "Count", "Distribution"]);
    applyHeader(wsConn, 2, 3);
    const connData = [
      ["NFC Tap", stats.connectionSources.nfc],
      ["QR Scan", stats.connectionSources.qr],
      ["Direct Link", stats.connectionSources.direct],
    ] as [string, number][];
    const maxConn = Math.max(...connData.map(([, v]) => v));
    connData.forEach(([name, val], i) => {
      const rowNum = 3 + i;
      const r = wsConn.getRow(rowNum);
      r.values = [name, val];
      r.eachCell((c: any) => { c.border = borderThin; });
      if (i % 2 === 0) r.eachCell((c: any) => { c.fill = accentFill; });
      addBar(wsConn, rowNum, 3, val, maxConn);
    });
    autoWidth(wsConn);

    // ═══ PERSONAS ═══
    if (stats.personaPerformance.length > 0) {
      const wsPer = wb.addWorksheet("Personas");
      wsPer.addRow(["PERSONA PERFORMANCE"]).font = sectionFont;
      wsPer.addRow(["Persona", "Views", "Save Rate", "Performance"]);
      applyHeader(wsPer, 2, 4);
      const maxT = Math.max(...stats.personaPerformance.map((p) => p.taps));
      stats.personaPerformance.forEach((p, i) => {
        const rowNum = 3 + i;
        const r = wsPer.getRow(rowNum);
        r.values = [p.name, p.taps, p.saveRate / 100];
        r.getCell(3).numFmt = "0.0%";
        r.eachCell((c: any) => { c.border = borderThin; });
        if (i % 2 === 0) r.eachCell((c: any) => { c.fill = accentFill; });
        addBar(wsPer, rowNum, 4, p.taps, maxT);
      });
      autoWidth(wsPer);
    }

    // ═══ SECURITY ═══
    const wsSec = wb.addWorksheet("Security");
    wsSec.addRow(["SECURITY METRICS"]).font = sectionFont;
    wsSec.addRow(["Metric", "Value"]);
    applyHeader(wsSec, 2, 2);
    [
      ["Auth Success Rate", `${stats.authSuccessRate}%`],
      ["Unauthorized Attempts", stats.unauthorizedAttempts],
    ].forEach(([m, v], i) => {
      const r = wsSec.addRow([m, v]);
      r.eachCell((c: any) => { c.border = borderThin; });
      if (i % 2 === 0) r.eachCell((c: any) => { c.fill = accentFill; });
    });
    autoWidth(wsSec);

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
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
