import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Heart, Eye, EyeOff, ArrowLeft } from "lucide-react";

interface LoginScreenProps {
  onLogin: (email: string, password: string, remember: boolean) => Promise<{ ok: boolean; message?: string }>;
  onBack?: () => void;
  onGuest?: () => void;
}

export function LoginScreen({ onLogin, onBack, onGuest }: LoginScreenProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [rememberDevice, setRememberDevice] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange =
    (field: "email" | "password") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((s) => ({ ...s, [field]: e.target.value }));
    };

  const handleSubmit = async (): Promise<void> => {
    setErrorMsg("");
    setSuccessMsg("");

    if (!formData.email || !formData.password) {
      setErrorMsg("Email dan password wajib diisi.");
      return;
    }

    setSubmitting(true);
    const res = await onLogin(formData.email, formData.password, rememberDevice);
    setSubmitting(false);
    if (!res.ok) {
      setErrorMsg(res.message || "Login gagal.");
      return;
    }

    setSuccessMsg("Berhasil masuk.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex items-center justify-center p-6">
      <div className="w-full max-w-md mx-auto">
        <Card className="shadow-xl border-2 border-primary/20">
          <CardHeader className="text-center space-y-4 relative">
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="absolute left-2 top-2 transition-all duration-200 hover:scale-110 active:scale-95"
                disabled={submitting}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div className="mx-auto w-14 h-14 bg-foreground rounded-full flex items-center justify-center">
              <Heart className="w-7 h-7 text-background" />
            </div>
            <CardTitle style={{ fontSize: "1.5rem" }}>Elder Care</CardTitle>
            <CardDescription>Sistem Monitoring Kesehatan Lansia</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {errorMsg && <div className="text-red-600 text-center text-sm">{errorMsg}</div>}
            {successMsg && <div className="text-green-600 text-center text-sm">{successMsg}</div>}

            <div className="space-y-4">
              <Input
                id="email"
                type="email"
                placeholder="Email"
                className="h-11 border border-border focus:border-primary"
                value={formData.email}
                onChange={handleChange("email")}
                disabled={submitting}
              />

              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className="h-11 border border-border focus:border-primary pr-12"
                  value={formData.password}
                  onChange={handleChange("password")}
                  disabled={submitting}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 transition-all duration-200 hover:scale-110 active:scale-95"
                  onClick={() => setShowPassword((s) => !s)}
                  disabled={submitting}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  disabled={submitting}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="remember" className="text-sm text-muted-foreground">
                  Percayai perangkat ini selama 30 hari
                </label>
              </div>

              <Button
                onClick={() => void handleSubmit()}
                className="w-full h-12 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                disabled={submitting}
              >
                {submitting ? "Memproses..." : "Masuk ke Sistem"}
              </Button>

              <div className="text-center">
                <Button variant="link" className="text-muted-foreground" disabled={submitting}>
                  Lupa Password?
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">atau akses sebagai guest (akses terbatas)</p>
                <Button
                  variant="outline"
                  className="w-full h-10 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  onClick={onGuest}
                  disabled={submitting}
                >
                  Kembali ke Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
