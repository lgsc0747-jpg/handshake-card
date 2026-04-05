import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAccountDialog({ open, onOpenChange }: DeleteAccountDialogProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const canSubmit = password.length >= 6 && password === confirmPassword && !deleting;

  const handleDelete = async () => {
    if (!canSubmit) return;
    setDeleting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Session expired", description: "Please log in again.", variant: "destructive" });
        setDeleting(false);
        return;
      }

      const res = await supabase.functions.invoke("delete-account", {
        body: { password },
      });

      if (res.error || res.data?.error) {
        toast({
          title: "Account deletion failed",
          description: res.data?.error || res.error?.message || "Unknown error",
          variant: "destructive",
        });
        setDeleting(false);
        return;
      }

      // Clear local data
      localStorage.clear();
      toast({ title: "Account deleted", description: "All your data has been permanently removed." });

      // Sign out and redirect
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Delete Account Permanently
          </DialogTitle>
          <DialogDescription>
            In accordance with the <strong>Data Privacy Act (RA 10173)</strong>, this will permanently erase all your personal data, personas, cards, interaction logs, leads, and uploaded files. This action is <strong>irreversible</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="del-pw" className="text-xs">Enter your password</Label>
            <Input
              id="del-pw"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="del-pw-confirm" className="text-xs">Re-type your password</Label>
            <Input
              id="del-pw-confirm"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-[10px] text-destructive">Passwords do not match</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={!canSubmit}>
            {deleting ? "Deleting…" : "Permanently Delete My Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
