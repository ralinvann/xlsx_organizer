import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Heart, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

interface LoginScreenProps {
  onLogin: () => void;
  onBack?: () => void;
  onGuest?: () => void;
}

export function LoginScreen({ onLogin, onBack, onGuest }: LoginScreenProps) {
  const { login, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [rememberDevice, setRememberDevice] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

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

    const res = await login(formData.email, formData.password, rememberDevice);
    if (!res.ok) {
      setErrorMsg(res.message || "Login gagal.");
      return;
    }

    setSuccessMsg("Berhasil masuk.");
    onLogin();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex items-center justify-center p-6">
      <div className="w-full max-w-md mx-auto">
        <Card className="shadow-xl border-2 border-primary/20">
          <CardHeader className="text-center space-y-4 relative">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="absolute left-2 top-2 h-8 w-8 p-0"
                disabled={loading}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <Heart className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-3xl">Elder Care</CardTitle>
            <CardDescription className="text-lg">Sistem Monitoring Kesehatan Lansia</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {errorMsg && <div className="text-red-600 text-center text-sm">{errorMsg}</div>}
            {successMsg && <div className="text-green-600 text-center text-sm">{successMsg}</div>}

            <div className="space-y-4">
              <Input
                id="email"
                type="email"
                placeholder="Email"
                className="h-12 text-lg border border-border focus:border-primary"
                value={formData.email}
                onChange={handleChange("email")}
                disabled={loading}
              />

              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className="h-12 text-lg border border-border focus:border-primary pr-12"
                  value={formData.password}
                  onChange={handleChange("password")}
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setShowPassword((s) => !s)}
                  disabled={loading}
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
                  disabled={loading}
                  className="w-4 h-4"
                />
                <label htmlFor="remember" className="text-sm text-muted-foreground">
                  Percayai perangkat ini selama 30 hari
                </label>
              </div>

              <Button
                onClick={() => void handleSubmit()}
                className="w-full h-14 text-xl"
                size="lg"
                disabled={loading}
              >
                {loading ? "Memproses…" : "Masuk ke Sistem"}
              </Button>

              <div className="text-center">
                <Button variant="link" className="text-lg text-muted-foreground" disabled={loading}>
                  Lupa Password?
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">atau akses sebagai guest (akses terbatas)</p>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full h-12 text-lg"
                  onClick={onGuest}
                  disabled={loading}
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
