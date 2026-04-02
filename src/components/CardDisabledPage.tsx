import { Wifi, ShieldOff } from "lucide-react";

interface CardDisabledPageProps {
  ownerName?: string;
}

export function CardDisabledPage({ ownerName }: CardDisabledPageProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <ShieldOff className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive flex items-center justify-center">
          <span className="text-destructive-foreground text-[10px] font-bold">!</span>
        </div>
      </div>

      <div className="text-center space-y-2 max-w-sm">
        <h1 className="text-2xl font-display font-bold">Card Temporarily Disabled</h1>
        <p className="text-muted-foreground text-sm">
          {ownerName
            ? `${ownerName} has temporarily deactivated this profile.`
            : "This profile has been temporarily deactivated by its owner."}
        </p>
        <p className="text-muted-foreground text-xs">
          The card owner may re-enable it at any time.
        </p>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <div className="w-5 h-5 rounded-md bg-primary/20 flex items-center justify-center">
          <Wifi className="w-3 h-3 text-primary" />
        </div>
        <span className="text-xs text-muted-foreground font-display">NFC Hub</span>
      </div>
    </div>
  );
}
