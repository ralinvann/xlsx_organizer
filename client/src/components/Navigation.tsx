import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Home, User, Users, HelpCircle, Upload, FileText, LogIn } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

interface NavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  userStatus: 'guest' | 'authenticated';
  onShowLogin: () => void;
  userRole?: string | null; // optional role; if absent user is treated as non-admin
}

export function Navigation({ currentPage, onPageChange, userStatus, onShowLogin, userRole }: NavigationProps) {
  const { user: authUser } = useAuth(); // fallback if parent didn't pass userRole

  const publicNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'help', label: 'Help', icon: HelpCircle },
  ];

  // Normalize role and define allowed admin roles
  const effectiveRole = userRole ?? authUser?.role ?? null;
  const roleNormalized = String(effectiveRole || "").toUpperCase().trim();
  const ALLOWED_ROLES = new Set(["ADMIN", "SUPERADMIN"]);
  const isAdminRole = ALLOWED_ROLES.has(roleNormalized);

  // Build authenticated nav items but include "users" only for allowed roles
  const authenticatedNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'upload', label: 'Upload', icon: Upload },
    { id: 'preview', label: 'Preview', icon: FileText },
    { id: 'account', label: 'Account', icon: User },
    // 'users' will only be visible when isAdminRole === true
    ...(isAdminRole ? [{ id: 'users', label: 'Users', icon: Users }] : []),
    { id: 'help', label: 'Help', icon: HelpCircle },
  ];

  const navItems = userStatus === 'authenticated' ? authenticatedNavItems : publicNavItems;

  const handleNavClick = (itemId: string) => {
    // Guests trying to access restricted pages are prompted to login
    if (userStatus === 'guest' && !['dashboard', 'help'].includes(itemId)) {
      onShowLogin();
      return;
    }
    // Extra safety: if the item is 'users' but role is not allowed, do nothing
    if (itemId === 'users' && !isAdminRole) return;
    onPageChange(itemId);
  };

  return (
    <nav className="bg-white shadow-sm border-b border-border p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold text-primary">Elder Care</h1>
            {userStatus === 'guest' && (
              <Badge variant="outline" className="text-sm px-3 py-1">
                Guest Mode
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Monitoring Kesehatan Lansia
            </div>
            {userStatus === 'guest' && (
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
            // since 'users' is not included for non-admins above, no further UI hiding needed
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