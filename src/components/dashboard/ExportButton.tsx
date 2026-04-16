import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { NfcStats } from "@/hooks/useNfcData";

interface ExportButtonProps {
  stats: NfcStats;
  chartData: { label: string; taps: number; vcards: number }[];
}

export function ExportButton({ stats, chartData }: ExportButtonProps) {
  const handleExport = async () => {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "Handshake";
    wb.created = new Date();

    const headerFont: Partial<ExcelJS.Font> = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    const headerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D9488" } };
    const sectionFont: Partial<ExcelJS.Font> = { bold: true, size: 11, color: { argb: "FF0D9488" } };
    const borderThin: Partial<ExcelJS.Borders> = {
      top: { style: "thin" }, bottom: { style: "thin" },
      left: { style: "thin" }, right: { style: "thin" },
    };
    const accentFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDFA" } };

    const applyHeader = (ws: ExcelJS.Worksheet, row: number, cols: number) => {
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

    const autoWidth = (ws: ExcelJS.Worksheet) => {
      ws.columns?.forEach((col) => {
        let maxLen = 12;
        (col as any).eachCell?.({ includeEmpty: false }, (cell: ExcelJS.Cell) => {
          const len = String(cell.value ?? "").length;
          if (len > maxLen) maxLen = len;
        });
        col.width = Math.min(maxLen + 4, 40);
      });
    };

    const addBar = (ws: ExcelJS.Worksheet, row: number, col: number, value: number, max: number, width: number = 20) => {
      const bars = max > 0 ? Math.round((value / max) * width) : 0;
      const cell = ws.getRow(row).getCell(col);
      cell.value = "█".repeat(bars) + "░".repeat(width - bars);
      cell.font = { size: 9, color: { argb: "FF0D9488" } };
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
        r.eachCell((c) => { c.border = borderThin; });
        if (i % 2 === 0) r.eachCell((c) => { c.fill = accentFill; });
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
          r.eachCell((c) => { c.border = borderThin; });
          if (i % 2 === 0) r.eachCell((c) => { c.fill = accentFill; });
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
          r.eachCell((c) => { c.border = borderThin; });
          if (i % 2 === 0) r.eachCell((c) => { c.fill = accentFill; });
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
          r.eachCell((ce) => { ce.border = borderThin; });
          if (i % 2 === 0) r.eachCell((ce) => { ce.fill = accentFill; });
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
      r.eachCell((c) => { c.border = borderThin; });
      if (i % 2 === 0) r.eachCell((c) => { c.fill = accentFill; });
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
        r.eachCell((c) => { c.border = borderThin; });
        if (i % 2 === 0) r.eachCell((c) => { c.fill = accentFill; });
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
      r.eachCell((c) => { c.border = borderThin; });
      if (i % 2 === 0) r.eachCell((c) => { c.fill = accentFill; });
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
