import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, User, Phone, Building2, MessageSquare, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ContactMeModalProps {
  open: boolean;
  onClose: () => void;
  personaId: string;
  ownerUserId: string;
  ownerName: string;
  accentColor: string;
}

export function ContactMeModal({
  open,
  onClose,
  personaId,
  ownerUserId,
  ownerName,
  accentColor,
}: ContactMeModalProps) {
  const { toast } = useToast();
  const [contact, setContact] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
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
      p_metadata: { ua: navigator.userAgent, source: "contact_me_button" },
    });

    if (!error && leadId) {
      supabase.functions.invoke("notify-new-lead", { body: { lead_id: leadId } }).catch(() => {});
    }

    if (error) {
      toast({ title: "Error", description: "Could not send your info. Try again.", variant: "destructive" });
    } else {
      // Track interaction
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      fetch(`https://${projectId}.supabase.co/functions/v1/log-interaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_user_id: ownerUserId,
          interaction_type: "contact_form_submit",
          metadata: { source: "contact_me_button", ua: navigator.userAgent },
        }),
      }).catch(() => {});

      toast({ title: "Message sent!", description: `${ownerName} will receive your contact info.` });
      setContact({ name: "", email: "", phone: "", company: "", message: "" });
      onClose();
    }
    setSubmitting(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md rounded-2xl border border-white/10 overflow-hidden"
              style={{
                background: `linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)) 100%)`,
                boxShadow: `0 0 60px ${accentColor}22`,
              }}
              initial={{ y: 100, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 100, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-5 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-display font-bold">Get in Touch</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Send your info to {ownerName}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Form */}
              <div className="px-5 pb-5 space-y-3">
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
                  onClick={handleSubmit}
                  className="w-full text-white"
                  style={{ background: accentColor }}
                  disabled={submitting || !contact.email}
                >
                  {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Mail className="w-4 h-4 mr-1.5" />}
                  Send Message
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
