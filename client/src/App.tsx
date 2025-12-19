import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigation } from "./components/Navigation";
import { LoginScreen } from "./components/LoginScreen";
import { Dashboard } from "./components/Dashboard";
import { UploadPage } from "./components/UploadPage";
import { PreviewEditPage } from "./components/PreviewEditPage";
import { UserProfile } from "./components/UserProfile";
import { AdminPage } from "./components/AdminPage";
import { useAuth } from "./hooks/useAuth";

type Page = "dashboard" | "login" | "upload" | "preview" | "account" | "users" | "help";

const PUBLIC_PAGES: Page[] = ["dashboard", "help", "login"];
const PROTECTED_PAGES: Page[] = ["upload", "preview", "account", "users"];

function isProtectedPage(p: Page) {
  return (PROTECTED_PAGES as string[]).includes(p);
}

export default function App() {
  const { user, ready } = useAuth();

  const isAuthed = !!user;
  const userStatus = isAuthed ? "authenticated" : "guest";

  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [previewData, setPreviewData] = useState<any>(null);

  // --- Centralized navigation helper (prevents invalid pages) ---
  const navigate = useCallback((page: Page) => {
    setCurrentPage(page);
  }, []);

  // --- Event: preview-ready (from Upload flow) ---
  useEffect(() => {
    const handler = () => {
      try {
        const raw = sessionStorage.getItem("previewData");
        if (!raw) return;
        const parsed = JSON.parse(raw);

        // keep full payload
        setPreviewData(parsed);
        setCurrentPage("preview");
      } catch (e) {
        console.warn("preview-ready handler parse failed", e);
      }
    };

    window.addEventListener("preview-ready", handler);
    return () => window.removeEventListener("preview-ready", handler);
  }, []);

  // --- Restore preview payload if user refreshes on preview page ---
  useEffect(() => {
    if (currentPage !== "preview") return;

    // If no local state, try sessionStorage
    if (previewData) return;

    try {
      const raw = sessionStorage.getItem("previewData");
      if (!raw) return;
      setPreviewData(JSON.parse(raw));
    } catch (e) {
      console.warn("Failed to restore previewData from sessionStorage", e);
    }
  }, [currentPage, previewData]);

  // --- Route guard: if user is guest and tries to access protected page, go login ---
  useEffect(() => {
    if (!ready) return; // wait for session check to complete

    if (!isAuthed && isProtectedPage(currentPage)) {
      setCurrentPage("login");
    }
  }, [ready, isAuthed, currentPage]);

  // --- If user becomes authed while on login, bounce to dashboard ---
  useEffect(() => {
    if (!ready) return;
    if (isAuthed && currentPage === "login") {
      setCurrentPage("dashboard");
    }
  }, [ready, isAuthed, currentPage]);

  const renderCurrentPage = useMemo(() => {
    // While checking session, keep UI stable (prevents flicker/redirect loops)
    if (!ready) {
      return (
        <div className="p-6 text-muted-foreground">
          Memuat sesi…
        </div>
      );
    }

    switch (currentPage) {
      case "login":
        return (
          <LoginScreen
            onLogin={() => {
              // useAuth will update user automatically
              setCurrentPage("dashboard");
            }}
            onBack={() => setCurrentPage("dashboard")}
          />
        );

      case "dashboard":
        return <Dashboard userStatus={userStatus} onLoginClick={() => setCurrentPage("login")} />;

      case "upload":
        // guard handled in effect; just render if reached
        return (
          <UploadPage
            onNavigate={(page: string, state?: any) => {
              if (page === "preview") {
                const data = state?.data ?? null;
                setPreviewData(data);
                setCurrentPage("preview");
                return;
              }
              // allow only known pages
              if (PUBLIC_PAGES.includes(page as Page) || PROTECTED_PAGES.includes(page as Page)) {
                setCurrentPage(page as Page);
              }
            }}
          />
        );

      case "preview":
        return (
          <PreviewEditPage
            initialData={previewData}
            onDone={() => {
              setPreviewData(null);
              setCurrentPage("dashboard");
            }}
            onCancel={() => {
              setCurrentPage("upload");
            }}
          />
        );

      case "account":
        return <UserProfile />;

      case "users":
        return <AdminPage />;

      case "help":
        return (
          <div className="p-6 space-y-8">
            <div>
              <h2 className="text-3xl font-semibold">Help & Support</h2>
              <p className="text-xl text-muted-foreground mt-2">
                Bantuan penggunaan sistem Elder Care
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-2xl font-semibold mb-4">Panduan Cepat</h3>
                <ul className="space-y-3 text-lg">
                  <li>• Cara upload data kesehatan</li>
                  <li>• Membaca dashboard statistik</li>
                  <li>• Mengelola profil pengguna</li>
                  <li>• Validasi dan edit data</li>
                </ul>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-2xl font-semibold mb-4">Kontak Support</h3>
                <div className="space-y-3 text-lg">
                  <p>📧 support@eldercare.id</p>
                  <p>📞 +62 21 1234-5678</p>
                  <p>🕐 Senin - Jumat, 08:00 - 17:00</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <Dashboard userStatus={userStatus} onLoginClick={() => setCurrentPage("login")} />;
    }
  }, [ready, currentPage, previewData, userStatus]);

  return (
    <div className="min-h-screen bg-background">
      {/* Keep navigation hidden on login page (your preference) */}
      {currentPage !== "login" && (
        <Navigation
          currentPage={currentPage}
          onPageChange={(p) => navigate(p as Page)}
          onShowLogin={() => setCurrentPage("login")}
        />
      )}

      <main className={currentPage === "login" ? "" : "max-w-7xl mx-auto"}>
        {renderCurrentPage}
      </main>
    </div>
  );
}
