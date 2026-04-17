import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChartTitleWithInfo } from "@/components/dashboard/ChartTitleWithInfo";

interface Insight {
  summary: string;
  bullets: string[];
  suggestion: string;
  generatedAt: string;
}

export function AIInsightsCard() {
  const { toast } = useToast();
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("dashboard-insights");
      if (error) {
        // Surface gateway-specific errors with a friendly message.
        const status = (error as any)?.context?.status;
        if (status === 429) {
          toast({ title: "Slow down", description: "Too many insights too fast — try again in a moment.", variant: "destructive" });
        } else if (status === 402) {
          toast({ title: "AI credits exhausted", description: "Add credits in Workspace settings to keep generating insights.", variant: "destructive" });
        } else {
          toast({ title: "Couldn't generate insight", description: error.message, variant: "destructive" });
        }
        return;
      }
      if ((data as any)?.error) {
        toast({ title: "Couldn't generate insight", description: (data as any).error, variant: "destructive" });
        return;
      }
      setInsight(data as Insight);
    } catch (err) {
      toast({
        title: "Network error",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-card animate-fade-in border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <ChartTitleWithInfo
            icon={<Sparkles className="w-4 h-4 text-primary" />}
            title="AI Weekly Insights"
            info="A natural-language recap of how your last 7 days compare to the previous 7. Generated on demand from your real interaction data — never stored."
          />
          <Button
            size="sm"
            variant={insight ? "ghost" : "default"}
            onClick={generate}
            disabled={loading}
            className="h-7 text-xs gap-1.5"
          >
            {loading ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> Thinking…</>
            ) : insight ? (
              <><RefreshCw className="w-3 h-3" /> Refresh</>
            ) : (
              <><Sparkles className="w-3 h-3" /> Generate</>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!insight && !loading && (
          <p className="text-xs text-muted-foreground">
            Tap <span className="font-medium text-foreground">Generate</span> to summarize what changed in your dashboard this week — written like a concierge briefing, not raw numbers.
          </p>
        )}
        {loading && !insight && (
          <div className="space-y-2">
            <div className="h-3 w-3/4 rounded bg-muted/50 animate-pulse" />
            <div className="h-3 w-full rounded bg-muted/50 animate-pulse" />
            <div className="h-3 w-2/3 rounded bg-muted/50 animate-pulse" />
          </div>
        )}
        {insight && (
          <div className="space-y-3 text-sm">
            <p className="leading-relaxed text-foreground">{insight.summary}</p>
            {insight.bullets.length > 0 && (
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {insight.bullets.map((b, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="rounded-md bg-primary/5 border border-primary/10 p-2.5 text-xs">
              <span className="font-medium text-primary">Try this next week:</span>{" "}
              <span className="text-foreground">{insight.suggestion}</span>
            </div>
            <p className="text-[10px] text-muted-foreground/70">
              Generated {new Date(insight.generatedAt).toLocaleString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
