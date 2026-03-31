import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const ShortUrlRedirect = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!code) {
      navigate("/", { replace: true });
      return;
    }
    try {
      // Decode the short code back to username (reverse of btoa + slice in NfcManagerPage)
      const padded = code + "=".repeat((4 - (code.length % 4)) % 4);
      const username = atob(padded);
      navigate(`/p/${username}`, { replace: true });
    } catch {
      navigate("/", { replace: true });
    }
  }, [code, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
};

export default ShortUrlRedirect;
