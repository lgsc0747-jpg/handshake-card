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
import { Wifi, LogIn, Eye, EyeOff, Lock, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Turnstile, TurnstileInstance } from "@marsidev/react-turnstile";
import { getTurnstileSiteKey, currentHostname, detectEnvironment } from "@/lib/turnstileEnv";
import { DestinationPicker } from "@/components/auth/DestinationPicker";
import { TurnstileDiagnostics } from "@/components/auth/TurnstileDiagnostics";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState<{ email: string } | null>(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
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
      body: {
        email,
        password,
        captcha_token: captchaToken,
        hostname: currentHostname(),
      },
    });

    resetCaptcha();

    if (error || (data && (data as any).error)) {
      const payload = (data as any) ?? {};
      const msg = payload.error ?? error?.message ?? "Login failed";

      if (payload.locked_until) {
        setLockoutUntil(new Date(payload.locked_until).getTime());
        toast({
          title: "Account temporarily locked",
          description: "Too many failed attempts. Please wait before trying again.",
          variant: "destructive",
        });
      } else if (payload.code === "captcha_failed") {
        toast({
          title: "Security check couldn't connect",
          description:
            "If you're on a preview link, this hostname may need to be whitelisted in Cloudflare Turnstile. Try the diagnostic below.",
          variant: "destructive",
        });
      } else {
        if (typeof payload.attempts_remaining === "number") {
          setAttemptsRemaining(payload.attempts_remaining);
        }
        toast({
          title: "Login failed",
          description: msg,
          variant: "destructive",
        });
      }
      setLoading(false);
      return;
    }

    const session = (data as any)?.session;
    const roles = (data as any)?.roles ?? {};
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

    setLoading(false);

    if (roles.default_destination === "choose") {
      setShowPicker({ email });
    } else {
      navigate("/");
    }
  };

  const isLocked = secondsLeft > 0;
  const submitDisabled = loading || !captchaToken || isLocked;
  const lockoutMinutes = Math.floor(secondsLeft / 60);
  const lockoutSecs = secondsLeft % 60;
  const formattedLockout = `${String(lockoutMinutes).padStart(2, "0")}:${String(lockoutSecs).padStart(2, "0")}`;

  const env = detectEnvironment();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {showPicker && <DestinationPicker email={showPicker.email} />}

      <Card className="w-full max-w-md glass-elevated animate-fade-in">
        <CardHeader className="text-center space-y-3">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mx-auto">
            <Wifi className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="font-display text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your Handshake account</CardDescription>
        </CardHeader>
        <CardContent>
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

          <form onSubmit={handleSubmit} className="space-y-4">
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
                siteKey={getTurnstileSiteKey()}
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

          <TurnstileDiagnostics captchaToken={captchaToken} />

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

          {env !== "prod" && (
            <p className="mt-2 text-[10px] text-muted-foreground text-center">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/40 font-mono">
                {env} mode · CAPTCHA test key
              </span>
            </p>
          )}

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
