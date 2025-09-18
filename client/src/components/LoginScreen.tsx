import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Heart, Eye, EyeOff, ArrowLeft } from "lucide-react";

interface LoginScreenProps {
  onLogin: () => void;
  onBack?: () => void;
  onGuest?: () => void; // add this prop
}

export function LoginScreen({ onLogin, onBack, onGuest }: LoginScreenProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Input change handler
  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  // Submit handler
  const handleSubmit = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const endpoint = "http://localhost:3001/api/auth/login";
      const body = {
        email: formData.email,
        password: formData.password,
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include", // send cookies if needed
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "login failed");

      localStorage.setItem("token", data.token || "");
      localStorage.setItem("user", JSON.stringify(data.user || {}));
      setSuccessMsg("Logged in successfully");
      if (onLogin) onLogin(); // Use callback to update app state and show dashboard
      // Remove: window.location.href = "/dashboard";
    } catch (err: any) {
      if (err.name === "TypeError" || err.message === "Failed to fetch") {
        setErrorMsg("Tidak dapat terhubung ke server. Pastikan server berjalan dan CORS diizinkan.");
      } else {
        setErrorMsg(err.message);
      }
    }
  };

  // Guest access handler
  const handleGuestAccess = () => {
    if (onGuest) {
      onGuest();
    }
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
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <Heart className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-3xl">Elder Care</CardTitle>
            <CardDescription className="text-lg">
              Sistem Monitoring Kesehatan Lansia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {errorMsg && (
              <div className="text-red-600 text-center text-sm">{errorMsg}</div>
            )}
            {successMsg && (
              <div className="text-green-600 text-center text-sm">{successMsg}</div>
            )}
            {/* Only Login Form */}
            <div className="space-y-4">
              <Input
                id="email"
                type="email"
                placeholder="Email"
                className="h-12 text-lg border border-border focus:border-primary"
                value={formData.email}
                onChange={handleChange("email")}
              />
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className="h-12 text-lg border border-border focus:border-primary pr-12"
                  value={formData.password}
                  onChange={handleChange("password")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <Button 
                onClick={handleSubmit}
                className="w-full h-14 text-xl"
                size="lg"
              >
                Masuk ke Sistem
              </Button>
              <div className="text-center">
                <Button variant="link" className="text-lg text-muted-foreground">
                  Lupa Password?
                </Button>
              </div>
            </div>
            {/* Guest Access Option */}
            <div className="pt-4 border-t border-border">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  atau akses sebagai guest (akses terbatas)
                </p>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full h-12 text-lg"
                  onClick={handleGuestAccess}
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