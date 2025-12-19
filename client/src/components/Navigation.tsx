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

  const handleLogout = () => {
    logout();
    // SPA navigation (no hard reload)
    onPageChange("login");
    onShowLogin();
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
    // If auth still initializing, don't bounce user around
    if (!ready) return;

    if (!isAuthed && !["dashboard", "help"].includes(itemId)) {
      onShowLogin();
      onPageChange("login");
      return;
    }

    onPageChange(itemId);
  };

  return (
    <nav className="bg-white shadow-sm border-b border-border p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold text-primary">Elder Care</h1>

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
              <Button
                onClick={() => {
                  onShowLogin();
                  onPageChange("login");
                }}
                size="lg"
                className="h-12 px-6 text-lg gap-3"
              >
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
