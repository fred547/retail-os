import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart } from "lucide-react";

export default function Loyalty() {
  const { data: tiers, isLoading } = trpc.loyalty.listTiers.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Loyalty Program</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage loyalty tiers, points, and milestones</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Heart className="h-4 w-4 text-primary" /> Loyalty Tiers</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : tiers && tiers.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {tiers.map((tier: any) => (
                <div key={tier.id} className="p-4 rounded-lg bg-secondary/30 border border-border/40">
                  <h3 className="font-semibold text-primary">{tier.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{tier.minPoints} — {tier.maxPoints ?? "Unlimited"} points</p>
                  <div className="mt-2 text-sm">
                    <span className="text-muted-foreground">Multiplier: </span>
                    <span className="font-medium">{tier.pointsMultiplier}x</span>
                  </div>
                  {tier.discountPercent && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Discount: </span>
                      <span className="font-medium">{tier.discountPercent}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No loyalty tiers configured. Set up tiers to start your loyalty program.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
