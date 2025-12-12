import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Home, User, Users, HelpCircle, Upload, FileText, LogIn } from "lucide-react";
import { useAuth, type Role } from "../hooks/useAuth";

interface NavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  userStatus: "guest" | "authenticated";
  onShowLogin: () => void;
  userRole?: Role | null; // optional override
}

export function Navigation({ currentPage, onPageChange, userStatus, onShowLogin, userRole }: NavigationProps) {
  const { user: authUser } = useAuth();

  const effectiveRole: Role | null = userRole ?? authUser?.role ?? null;
  const isAdminRole = effectiveRole === "admin" || effectiveRole === "superadmin";

  const publicNavItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "help", label: "Help", icon: HelpCircle },
  ];

  const authenticatedNavItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "upload", label: "Upload", icon: Upload },
    { id: "preview", label: "Preview", icon: FileText },
    { id: "account", label: "Account", icon: User },
    ...(isAdminRole ? [{ id: "users", label: "Users", icon: Users }] : []),
    { id: "help", label: "Help", icon: HelpCircle },
  ];

  const navItems = userStatus === "authenticated" ? authenticatedNavItems : publicNavItems;

  const handleNavClick = (itemId: string) => {
    if (userStatus === "guest" && !["dashboard", "help"].includes(itemId)) {
      onShowLogin();
      return;
    }

    if (itemId === "users" && !isAdminRole) return;

    // optional: block preview if no stored previewData exists
    if (itemId === "preview") {
      const raw = sessionStorage.getItem("previewData");
      if (!raw) {
        // no data yet, send to upload instead
        onPageChange("upload");
        return;
      }
    }

    onPageChange(itemId);
  };

  return (
    <nav className="bg-white shadow-sm border-b border-border p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold text-primary">Elder Care</h1>
            {userStatus === "guest" && (
              <Badge variant="outline" className="text-sm px-3 py-1">
                Guest Mode
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">Monitoring Kesehatan Lansia</div>
            {userStatus === "guest" && (
              <Button onClick={onShowLogin} size="lg" className="h-12 px-6 text-lg gap-3">
                <LogIn size={20} />
                Login
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={currentPage === item.id ? "default" : "outline"}
                size="lg"
                onClick={() => handleNavClick(item.id)}
                className="h-12 px-6 text-lg gap-3"
              >
                <Icon size={20} />
                {item.label}
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
