import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Lock, Mail, User, Phone, Building2, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SecurityGateProps {
  personaId: string;
  ownerUserId: string;
  ownerName: string;
  pinRequired: boolean;
  contactRequired: boolean;
  accentColor: string;
  onUnlocked: () => void;
}

export function SecurityGate({
  personaId,
  ownerUserId,
  ownerName,
  pinRequired,
  contactRequired,
  accentColor,
  onUnlocked,
}: SecurityGateProps) {
  const { toast } = useToast();
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [contact, setContact] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const trackSecurityAttempt = (result: string) => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    fetch(`https://${projectId}.supabase.co/functions/v1/log-interaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_user_id: ownerUserId,
        interaction_type: "security_attempt",
        metadata: { result, method: pinRequired ? "pin" : "contact_exchange", ua: navigator.userAgent },
      }),
    }).catch(() => {});
  };

  const handlePinSubmit = async () => {
    setVerifying(true);
    setPinError(false);

    const { data, error } = await (supabase.rpc as any)("verify_persona_pin", {
      p_persona_id: personaId,
      p_pin: pin,
    });

    if (error || !data) {
      setPinError(true);
      trackSecurityAttempt("failed");
      toast({ title: "Incorrect PIN", description: "Please try again.", variant: "destructive" });
    } else {
      trackSecurityAttempt("success");
      onUnlocked();
    }
    setVerifying(false);
  };

  const handleContactSubmit = async () => {
    if (!contact.email) {
      toast({ title: "Email required", description: "Please enter your email address.", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    const { data: leadId, error } = await (supabase.rpc as any)("insert_lead_capture", {
      p_owner_user_id: ownerUserId,
      p_persona_id: personaId,
      p_visitor_name: contact.name || null,
      p_visitor_email: contact.email,
      p_visitor_phone: contact.phone || null,
      p_visitor_company: contact.company || null,
      p_visitor_message: contact.message || null,
      p_metadata: { ua: navigator.userAgent, source: "security_gate" },
    });

    if (error) {
      toast({ title: "Error", description: "Could not submit your info. Try again.", variant: "destructive" });
    } else {
      trackSecurityAttempt("success");
      // Fire-and-forget owner notification
      if (leadId) {
        supabase.functions.invoke("notify-new-lead", { body: { lead_id: leadId } }).catch(() => {});
      }
      toast({ title: "Access granted!", description: `${ownerName} will see your contact info.` });
      onUnlocked();
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-md"
      >
        <div
          className="rounded-2xl border border-border/60 overflow-hidden"
          style={{
            background: `linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)) 100%)`,
            boxShadow: `0 0 60px ${accentColor}22`,
          }}
        >
          {/* Header */}
          <div className="p-6 pb-4 text-center space-y-3">
            <div
              className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
              style={{ background: `${accentColor}20` }}
            >
              <Shield className="w-7 h-7" style={{ color: accentColor }} />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold">Private Profile</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {pinRequired
                  ? `Enter the PIN to view ${ownerName}'s profile`
                  : `Share your contact info to unlock ${ownerName}'s profile`}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6">
            <AnimatePresence mode="wait">
              {pinRequired ? (
                <motion.div
                  key="pin"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="flex justify-center">
                    <InputOTP maxLength={4} value={pin} onChange={setPin}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  {pinError && (
                    <p className="text-destructive text-xs text-center">Incorrect PIN. Try again.</p>
                  )}
                  <Button
                    onClick={handlePinSubmit}
                    className="w-full"
                    style={{ background: accentColor }}
                    disabled={pin.length < 4 || verifying}
                  >
                    {verifying ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Lock className="w-4 h-4 mr-1.5" />}
                    Unlock Profile
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="contact"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-3"
                >
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Your name"
                      className="pl-9"
                      value={contact.name}
                      onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Your email *"
                      type="email"
                      className="pl-9"
                      value={contact.email}
                      onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Phone (optional)"
                      className="pl-9"
                      value={contact.phone}
                      onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
                    />
                  </div>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Company (optional)"
                      className="pl-9"
                      value={contact.company}
                      onChange={(e) => setContact((c) => ({ ...c, company: e.target.value }))}
                    />
                  </div>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Message (optional)"
                      className="pl-9"
                      value={contact.message}
                      onChange={(e) => setContact((c) => ({ ...c, message: e.target.value }))}
                    />
                  </div>
                  <Button
                    onClick={handleContactSubmit}
                    className="w-full text-white"
                    style={{ background: accentColor }}
                    disabled={submitting || !contact.email}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Mail className="w-4 h-4 mr-1.5" />}
                    Exchange & Unlock
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
