import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Heart, Eye, EyeOff, Home } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

interface LoginScreenProps {
  onLogin: () => void;
  onBack?: () => void; // will act as "Back to Home"
}

export function LoginScreen({ onLogin, onBack }: LoginScreenProps) {
  const { login, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const goHome = () => {
    if (onBack) onBack();
    else window.location.href = "/"; // safe default
  };

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

    const res = await login(formData.email, formData.password);
    if (!res.ok) {
      setErrorMsg(res.message || "Login gagal.");
      return;
    }

    setSuccessMsg("Berhasil masuk.");
    onLogin();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary relative flex items-center justify-center p-6">
      {/* Back to Home button OUTSIDE the card */}
      <div className="absolute left-6 top-6">
        <Button
          variant="outline"
          size="lg"
          className="h-11 px-4 gap-2"
          onClick={goHome}
          disabled={loading}
        >
          <Home className="w-5 h-5" />
          Back to Home
        </Button>
      </div>

      <div className="w-full max-w-md mx-auto">
        <Card className="shadow-xl border-2 border-primary/20">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <Heart className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-3xl">Elder Care</CardTitle>
            <CardDescription className="text-lg">
              Sistem Monitoring Kesehatan Lansia
            </CardDescription>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
