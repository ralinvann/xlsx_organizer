import { useEffect, useState } from "react";
import { Navigation } from "./components/Navigation";
import { LoginScreen } from "./components/LoginScreen";
import { Dashboard } from "./components/Dashboard";
import { UploadPage } from "./components/UploadPage";
import { PreviewEditPage } from "./components/PreviewEditPage";
import { UserProfile } from "./components/UserProfile";
import { AdminPage } from "./components/AdminPage";
import { useAuth } from "./hooks/useAuth";

export default function App() {
  const { isAuthed, ready, loading, login, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [previewData, setPreviewData] = useState<any>(null);

  useEffect(() => {
    if (!ready || loading) return;

    const protectedPages = ["upload", "preview", "account", "users"];
    if (
      !isAuthed &&
      currentPage !== "login" &&
      protectedPages.includes(currentPage)
    ) {
      setCurrentPage("login");
    }
  }, [ready, loading, isAuthed, currentPage]);

  useEffect(() => {
    const handler = () => {
      try {
        const raw = sessionStorage.getItem("previewData");
        if (!raw) return;
        const parsed = JSON.parse(raw);

        setPreviewData(parsed);
        setCurrentPage("preview");
      } catch (e) {
        console.warn("preview-ready handler parse failed", e);
      }
    };

    window.addEventListener("preview-ready", handler);
    return () => window.removeEventListener("preview-ready", handler);
  }, []);

  const handlePageChange = (page: string) => {
    const protectedPages = ["upload", "preview", "account", "users"];
    if (protectedPages.includes(page) && !isAuthed) {
      setCurrentPage("login");
    } else {
      setCurrentPage(page);
    }
  };

  const handleLogout = async () => {
    await logout();
    setCurrentPage("login");
  };

  const renderCurrentPage = () => {
    if (!ready || loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-lg">Loading...</p>
          </div>
        </div>
      );
    }

    switch (currentPage) {
      case "login":
        return (
          <LoginScreen
            onLogin={async (email, password, remember) => {
              const result = await login(email, password, remember);
              if (result.ok) setCurrentPage("dashboard");
              return result;
            }}
            onBack={() => setCurrentPage("dashboard")}
            onGuest={() => setCurrentPage("dashboard")}
          />
        );

      case "dashboard":
        return (
          <Dashboard
            userStatus={isAuthed ? "authenticated" : "guest"}
            onLoginClick={() => setCurrentPage("login")}
          />
        );

      case "upload":
        return (
          <UploadPage
            onNavigate={(page, state) => {
              if (page === "preview") {
                setPreviewData(state?.data ?? null);
                setCurrentPage("preview");
              } else {
                setCurrentPage(page);
              }
            }}
          />
        );

      case "preview":
        return (
          <PreviewEditPage
            initialData={previewData}
            onDone={() => setCurrentPage("dashboard")}
            onCancel={() => setCurrentPage("upload")}
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
        return (
          <Dashboard
            userStatus={isAuthed ? "authenticated" : "guest"}
            onLoginClick={() => setCurrentPage("login")}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {currentPage !== "login" && (
        <Navigation
          currentPage={currentPage}
          onPageChange={handlePageChange}
          isAuthed={isAuthed}
          onShowLogin={() => setCurrentPage("login")}
          onLogout={() => void handleLogout()}
        />
      )}
      <main className={currentPage === "login" ? "" : "max-w-7xl mx-auto"}>
        {renderCurrentPage()}
      </main>
    </div>
  );
}
