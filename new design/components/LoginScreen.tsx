import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Heart, Eye, EyeOff, ArrowLeft } from "lucide-react";

interface LoginScreenProps {
  onLogin: () => void;
  onBack?: () => void;
}

export function LoginScreen({ onLogin, onBack }: LoginScreenProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
            
            {/* Dynamic Tab Container */}
            <div className="flex bg-muted rounded-lg p-1">
              <button
                onClick={() => setActiveTab('login')}
                className={`flex-1 px-4 py-3 text-lg font-medium rounded-md transition-all ${
                  activeTab === 'login'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setActiveTab('signup')}
                className={`flex-1 px-4 py-3 text-lg font-medium rounded-md transition-all ${
                  activeTab === 'signup'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sign Up
              </button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {activeTab === 'login' ? (
              // Login Form
              <div className="space-y-4">
                <Input
                  id="username"
                  type="text"
                  placeholder="Username"
                  className="h-12 text-lg border-2"
                />
                
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    className="h-12 text-lg border-2 pr-12"
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
                  onClick={onLogin}
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
            ) : (
              // Sign Up Form
              <div className="space-y-4">
                <Input
                  id="fullname"
                  type="text"
                  placeholder="Nama Lengkap"
                  className="h-12 text-lg border-2"
                />
                
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  className="h-12 text-lg border-2"
                />
                
                <Input
                  id="new-username"
                  type="text"
                  placeholder="Username"
                  className="h-12 text-lg border-2"
                />
                
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    className="h-12 text-lg border-2 pr-12"
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
                
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Konfirmasi Password"
                    className="h-12 text-lg border-2 pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                
                <Button 
                  onClick={onLogin}
                  className="w-full h-14 text-xl"
                  size="lg"
                >
                  Daftar Akun Baru
                </Button>
                
                <div className="text-center text-sm text-muted-foreground">
                  Dengan mendaftar, Anda menyetujui{' '}
                  <Button variant="link" className="text-sm p-0 h-auto">
                    Syarat & Ketentuan
                  </Button>
                  {' '}kami
                </div>
              </div>
            )}

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
                  onClick={() => window.history.back()}
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