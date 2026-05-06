/**
 * Thin adapter around the shadcn `<ChartContainer>` (Recharts under the hood)
 * with Apple-grade defaults — palette pulled from `useChartPalette`, fixed
 * tooltip styling, responsive height tiers, and the Inter/SF Pro typography.
 *
 * Usage:
 *   <Chart
 *     config={{ taps: { label: "Taps", color: palette[0] } }}
 *     height="md"
 *   >
 *     <LineChart data={data}>
 *       <CartesianGrid vertical={false} />
 *       <XAxis dataKey="day" tickLine={false} axisLine={false} />
 *       <YAxis hide />
 *       <Line dataKey="taps" type="monotone" stroke="var(--color-taps)" />
 *       <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
 *     </LineChart>
 *   </Chart>
 *
 * Existing Recharts call-sites continue to work; adopt this incrementally.
 */
import * as React from "react";
import { ResponsiveContainer } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useChartPalette } from "@/components/dashboard/ChartPaletteSelector";
import { cn } from "@/lib/utils";

const HEIGHTS = {
  xs: "h-32 sm:h-36",
  sm: "h-40 sm:h-48",
  md: "h-56 sm:h-64",
  lg: "h-64 sm:h-80",
  xl: "h-80 sm:h-96",
} as const;

interface ChartProps {
  /**
   * Optional config — if omitted, the active palette is automatically mapped
   * to series keys you reference via `var(--color-<key>)`.
   */
  config?: ChartConfig;
  /** Series keys to auto-color from the active palette when no `config` is passed. */
  series?: string[];
  height?: keyof typeof HEIGHTS;
  className?: string;
  children: React.ComponentProps<typeof ResponsiveContainer>["children"];
}

export function Chart({ config, series, height = "md", className, children }: ChartProps) {
  const { colors } = useChartPalette();

  const resolvedConfig: ChartConfig = React.useMemo(() => {
    if (config) return config;
    if (!series?.length) return {};
    return Object.fromEntries(
      series.map((key, i) => [key, { label: key, color: colors[i % colors.length] }]),
    );
  }, [config, series, colors]);

  return (
    <ChartContainer
      config={resolvedConfig}
      className={cn(HEIGHTS[height], "w-full", className)}
    >
      {children}
    </ChartContainer>
  );
}

export { ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent };
export type { ChartConfig };
