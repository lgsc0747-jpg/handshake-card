import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Wifi, UserPlus, Eye, EyeOff, User, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SignupPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [accountType, setAccountType] = useState<"personal" | "agency">("personal");
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Weak password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords are identical.", variant: "destructive" });
      return;
    }
    if (!username.match(/^[a-z0-9_-]{3,30}$/)) {
      toast({ title: "Invalid username", description: "Use 3-30 lowercase letters, numbers, hyphens, or underscores.", variant: "destructive" });
      return;
    }
    if (!agreedToTerms) {
      toast({ title: "Terms required", description: "You must agree to the Terms of Service and Privacy Policy.", variant: "destructive" });
      return;
    }

    setLoading(true);

    // Check username uniqueness via secure RPC
    const { data: isAvailable } = await (supabase.rpc as any)("check_username_available", {
      p_username: username,
    });

    if (!isAvailable) {
      toast({ title: "Username taken", description: "Please choose a different username.", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName, username },
      },
    });

    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "We sent a verification link to confirm your account." });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md glass-elevated animate-fade-in">
        <CardHeader className="text-center space-y-3">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mx-auto">
            <Wifi className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="font-display text-2xl">Create your account</CardTitle>
          <CardDescription>Set up your NFC-powered digital identity</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Full Name</label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Alex Smith" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Username (your public URL slug)</label>
              <div className="flex items-center gap-0">
                <span className="text-xs text-muted-foreground bg-muted px-2.5 py-2.5 rounded-l-md border border-r-0 border-input">/p/</span>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                  placeholder="alex-smith"
                  className="rounded-l-none"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Password</label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="pr-10" />
                <button type="button" onMouseDown={() => setShowPassword(true)} onMouseUp={() => setShowPassword(false)} onMouseLeave={() => setShowPassword(false)} onTouchStart={() => setShowPassword(true)} onTouchEnd={() => setShowPassword(false)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors select-none">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Confirm Password</label>
              <div className="relative">
                <Input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required className="pr-10" />
                <button type="button" onMouseDown={() => setShowConfirm(true)} onMouseUp={() => setShowConfirm(false)} onMouseLeave={() => setShowConfirm(false)} onTouchStart={() => setShowConfirm(true)} onTouchEnd={() => setShowConfirm(false)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors select-none">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(v) => setAgreedToTerms(v === true)}
                className="mt-0.5"
              />
              <label htmlFor="terms" className="text-xs text-muted-foreground leading-snug cursor-pointer">
                I agree to the{" "}
                <Link to="/terms" target="_blank" className="text-primary hover:underline">Terms of Service</Link>{" "}
                and{" "}
                <Link to="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</Link>,
                and consent to the collection and processing of my personal data in accordance with the Data Privacy Act of 2012 (RA 10173).
              </label>
            </div>
            <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading || !agreedToTerms}>
              <UserPlus className="w-4 h-4 mr-1.5" />
              {loading ? "Creating account…" : "Create Account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignupPage;
