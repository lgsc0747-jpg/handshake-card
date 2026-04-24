import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Wifi, LogIn, ShieldCheck, Eye, EyeOff, Lock, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Turnstile, TurnstileInstance } from "@marsidev/react-turnstile";
import { TURNSTILE_SITE_KEY } from "@/lib/turnstile";

type Tab = "user" | "admin";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tab, setTab] = useState<Tab>("user");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Countdown ticker for lockout
  useEffect(() => {
    if (!lockoutUntil) {
      setSecondsLeft(0);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) setLockoutUntil(null);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockoutUntil]);

  // Probe lockout when email blurs
  const checkLockout = async (probeEmail: string) => {
    if (!probeEmail.trim()) return;
    const { data } = await supabase.rpc("check_login_lockout", {
      p_email: probeEmail.trim().toLowerCase(),
    });
    const result = data as { locked?: boolean; until?: string; seconds_remaining?: number } | null;
    if (result?.locked && result.until) {
      setLockoutUntil(new Date(result.until).getTime());
    }
  };

  const resetCaptcha = () => {
    setCaptchaToken(null);
    turnstileRef.current?.reset();
  };

  const handleSubmit = async (e: React.FormEvent, intent: Tab) => {
    e.preventDefault();
    if (!captchaToken) {
      toast({
        title: "Please complete the security check",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    setAttemptsRemaining(null);

    const { data, error } = await supabase.functions.invoke("secure-login", {
      body: { email, password, captcha_token: captchaToken, intent },
    });

    // Single-use token — always reset
    resetCaptcha();

    if (error || (data && (data as any).error)) {
      const payload = (data as any) ?? {};
      const msg = payload.error ?? error?.message ?? "Login failed";

      // Lockout response (HTTP 423 surfaces in error.context too, but we read payload)
      if (payload.locked_until) {
        setLockoutUntil(new Date(payload.locked_until).getTime());
        toast({
          title: "Account temporarily locked",
          description: "Too many failed attempts. Please wait before trying again.",
          variant: "destructive",
        });
      } else {
        if (typeof payload.attempts_remaining === "number") {
          setAttemptsRemaining(payload.attempts_remaining);
        }
        toast({
          title: intent === "admin" ? "Admin login failed" : "Login failed",
          description: msg,
          variant: "destructive",
        });
      }
      setLoading(false);
      return;
    }

    const session = (data as any)?.session;
    if (!session?.access_token) {
      toast({
        title: "Login failed",
        description: "No session returned",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { error: setErr } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    if (setErr) {
      toast({
        title: "Session error",
        description: setErr.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (intent === "admin") {
      toast({ title: "Welcome, Admin!" });
      navigate("/admin");
    } else {
      navigate("/");
    }
    setLoading(false);
  };

  const isLocked = secondsLeft > 0;
  const submitDisabled = loading || !captchaToken || isLocked;
  const lockoutMinutes = Math.floor(secondsLeft / 60);
  const lockoutSecs = secondsLeft % 60;
  const formattedLockout = `${String(lockoutMinutes).padStart(2, "0")}:${String(lockoutSecs).padStart(2, "0")}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md glass-elevated animate-fade-in">
        <CardHeader className="text-center space-y-3">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mx-auto">
            <Wifi className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="font-display text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your NFC Hub account</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={tab}
            onValueChange={(v) => {
              setTab(v as Tab);
              setAttemptsRemaining(null);
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="user">User Login</TabsTrigger>
              <TabsTrigger value="admin" className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Admin
              </TabsTrigger>
            </TabsList>

            {isLocked && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-2">
                <Lock className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <div className="text-xs text-destructive">
                  <p className="font-semibold">Account temporarily locked for security</p>
                  <p className="opacity-90 mt-0.5">
                    Try again in <span className="font-mono font-bold">{formattedLockout}</span>
                  </p>
                </div>
              </div>
            )}

            {!isLocked && attemptsRemaining !== null && attemptsRemaining < 5 && (
              <div className="mb-4 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  <span className="font-semibold">{attemptsRemaining}</span>{" "}
                  attempt{attemptsRemaining === 1 ? "" : "s"} remaining before lockout.
                </p>
              </div>
            )}

            <TabsContent value="user">
              <form onSubmit={(e) => handleSubmit(e, "user")} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={(e) => checkLockout(e.target.value)}
                    placeholder="you@example.com"
                    required
                    disabled={isLocked}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="pr-10"
                      disabled={isLocked}
                    />
                    <button
                      type="button"
                      onMouseDown={() => setShowPassword(true)}
                      onMouseUp={() => setShowPassword(false)}
                      onMouseLeave={() => setShowPassword(false)}
                      onTouchStart={() => setShowPassword(true)}
                      onTouchEnd={() => setShowPassword(false)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors select-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-center">
                  <Turnstile
                    ref={turnstileRef}
                    siteKey={TURNSTILE_SITE_KEY}
                    onSuccess={setCaptchaToken}
                    onExpire={() => setCaptchaToken(null)}
                    onError={() => setCaptchaToken(null)}
                    options={{ theme: "auto" }}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full gradient-primary text-primary-foreground"
                  disabled={submitDisabled}
                >
                  <LogIn className="w-4 h-4 mr-1.5" />
                  {loading ? "Signing in…" : isLocked ? `Locked (${formattedLockout})` : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="admin">
              <form onSubmit={(e) => handleSubmit(e, "admin")} className="space-y-4">
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-2">
                  <p className="text-xs text-amber-500 font-medium">
                    Admin accounts require an admin role in the database. Only users with the admin
                    role can sign in here.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Admin Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={(e) => checkLockout(e.target.value)}
                    placeholder="admin@example.com"
                    required
                    disabled={isLocked}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="pr-10"
                      disabled={isLocked}
                    />
                    <button
                      type="button"
                      onMouseDown={() => setShowPassword(true)}
                      onMouseUp={() => setShowPassword(false)}
                      onMouseLeave={() => setShowPassword(false)}
                      onTouchStart={() => setShowPassword(true)}
                      onTouchEnd={() => setShowPassword(false)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors select-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-center">
                  <Turnstile
                    ref={turnstileRef}
                    siteKey={TURNSTILE_SITE_KEY}
                    onSuccess={setCaptchaToken}
                    onExpire={() => setCaptchaToken(null)}
                    onError={() => setCaptchaToken(null)}
                    options={{ theme: "auto" }}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  disabled={submitDisabled}
                >
                  <ShieldCheck className="w-4 h-4 mr-1.5" />
                  {loading ? "Verifying…" : isLocked ? `Locked (${formattedLockout})` : "Admin Sign In"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-4 text-center text-sm space-y-2">
            <Link to="/forgot-password" className="text-primary hover:underline block">
              Forgot password?
            </Link>
            <p className="text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground text-center leading-relaxed">
            By signing in, you agree to our{" "}
            <Link to="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>{" "}
            in compliance with the Data Privacy Act of 2012 (RA 10173).
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
