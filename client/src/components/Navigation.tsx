import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Home, User, Users, HelpCircle, Upload, FileText, LogIn, LogOut } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

interface NavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  onShowLogin: () => void;
}

export function Navigation({ currentPage, onPageChange, onShowLogin }: NavigationProps) {
  const { user, ready, logout } = useAuth();

  const isAuthed = !!user;
  const userStatus = isAuthed ? "authenticated" : "guest";

  const goLogin = () => {
    // Ensure the UI actually renders login
    onPageChange("login");  // IMPORTANT: your App must render <LoginScreen/> when currentPage === "login"
    onShowLogin();          // if you're using a modal, keep this too; harmless if not
  };

  const handleLogout = () => {
    logout();
    onPageChange("dashboard");
  };

  const publicNavItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "help", label: "Help", icon: HelpCircle },
  ];

  const authenticatedNavItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "upload", label: "Upload", icon: Upload },
    { id: "preview", label: "Preview", icon: FileText },
    { id: "account", label: "Account", icon: User },
    { id: "users", label: "Users", icon: Users },
    { id: "help", label: "Help", icon: HelpCircle },
  ];

  const navItems = userStatus === "authenticated" ? authenticatedNavItems : publicNavItems;

  const handleNavClick = (itemId: string) => {
    if (!ready) return;

    const isPublic = ["dashboard", "help"].includes(itemId);

    if (!isAuthed && !isPublic) {
      goLogin();
      return;
    }

    onPageChange(itemId);
  };

  return (
    <nav className="bg-white shadow-sm border-b border-border p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {/* Make title clickable => go home */}
            <button
              type="button"
              onClick={() => onPageChange("dashboard")}
              className="text-2xl font-semibold text-primary hover:opacity-90"
            >
              Elder Care
            </button>

            {!ready ? (
              <Badge variant="outline" className="text-sm px-3 py-1">
                Checking session…
              </Badge>
            ) : userStatus === "guest" ? (
              <Badge variant="outline" className="text-sm px-3 py-1">
                Guest Mode
              </Badge>
            ) : (
              <Badge variant="outline" className="text-sm px-3 py-1">
                Logged in
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">Monitoring Kesehatan Lansia</div>

            {!ready ? (
              <Button size="lg" className="h-12 px-6 text-lg gap-3" disabled>
                Checking…
              </Button>
            ) : userStatus === "guest" ? (
              <Button onClick={goLogin} size="lg" className="h-12 px-6 text-lg gap-3">
                <LogIn size={20} />
                Login
              </Button>
            ) : (
              <Button onClick={handleLogout} size="lg" className="h-12 px-6 text-lg gap-3">
                <LogOut size={20} />
                Logout
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isRestricted = userStatus === "guest" && !["dashboard", "help"].includes(item.id);

            return (
              <Button
                key={item.id}
                variant={currentPage === item.id ? "default" : "outline"}
                size="lg"
                onClick={() => handleNavClick(item.id)}
                className={`h-12 px-6 text-lg gap-3 ${isRestricted ? "opacity-60" : ""}`}
                disabled={!ready}
              >
                <Icon size={20} />
                {item.label}
                {isRestricted && <span className="text-xs">🔒</span>}
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
