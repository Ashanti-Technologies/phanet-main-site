"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";

type Props = {
  title: string;
  value: string;
  delta: number; // percentage, e.g. 12.4
  deltaLabel?: string;
  series: { x: string; y: number }[];
  positiveColor?: string; // CSS var or color
};

const SPARKLINE_INITIAL_DIMENSION = { width: 240, height: 48 } as const;

function formatDelta(delta: number): string {
  if (!Number.isFinite(delta)) return "—";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}%`;
}

export function KpiCard({
  title,
  value,
  delta,
  deltaLabel = "vs. previous period",
  series,
  positiveColor = "var(--chart-1)",
}: Props) {
  const direction = delta > 0.5 ? "up" : delta < -0.5 ? "down" : "flat";
  const Icon =
    direction === "up"
      ? ArrowUpRight
      : direction === "down"
        ? ArrowDownRight
        : ArrowRight;

  return (
    <Card className="overflow-hidden py-4 gap-3">
      <CardHeader className="px-5">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium",
              direction === "up" &&
                "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
              direction === "down" &&
                "bg-red-500/10 text-red-600 dark:text-red-400",
              direction === "flat" && "bg-muted text-muted-foreground",
            )}
            aria-label={`${formatDelta(delta)} ${deltaLabel}`}
          >
            <Icon className="h-3 w-3" />
            {formatDelta(delta)}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{deltaLabel}</p>
      </CardContent>
      <div className="h-12 min-w-0 w-full -mt-1">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          minHeight={48}
          initialDimension={SPARKLINE_INITIAL_DIMENSION}
        >
          <AreaChart
            data={series}
            margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id={`spark-${title.replace(/\s+/g, "-")}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={positiveColor} stopOpacity={0.4} />
                <stop offset="100%" stopColor={positiveColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="y"
              stroke={positiveColor}
              strokeWidth={1.5}
              fill={`url(#spark-${title.replace(/\s+/g, "-")})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
