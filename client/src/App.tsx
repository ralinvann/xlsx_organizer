import { useEffect, useState } from 'react';
import { Navigation } from './components/Navigation';
import { LoginScreen } from './components/LoginScreen';
import { Dashboard } from './components/Dashboard';
import { UploadPage } from './components/UploadPage';
import { PreviewEditPage } from './components/PreviewEditPage';
import { UserProfile } from './components/UserProfile';
import { AdminPage } from './components/AdminPage';

type UserStatus = 'guest' | 'authenticated';

export default function App() {
  const [userStatus, setUserStatus] = useState<UserStatus>('guest');
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [previewData, setPreviewData] = useState<any>(null);

  useEffect(() => {
    const handler = () => {
      try {
        const raw = sessionStorage.getItem("previewData");
        if (!raw) return;
        const parsed = JSON.parse(raw);

        if (parsed && parsed.rows && parsed.headerKeys) {
          setPreviewData(parsed.rows ? parsed.rows : parsed);
        } else if (Array.isArray(parsed)) {
          setPreviewData(parsed);
        } else if (parsed.rows) {
          setPreviewData(parsed.rows);
        }

        setCurrentPage("preview");
      } catch (e) {
        console.warn("preview-ready handler parse failed", e);
      }
    };

    window.addEventListener("preview-ready", handler);
    return () => window.removeEventListener("preview-ready", handler);
  }, []);

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'login':
        return (
          <LoginScreen 
            onLogin={() => {
              setUserStatus('authenticated');
              setCurrentPage('dashboard');
            }}
          />
        );
      case 'dashboard':
        return <Dashboard userStatus={userStatus} />;
      case 'upload':
        if (userStatus === 'guest') {
          setCurrentPage('login');
          return <Dashboard userStatus={userStatus} />;
        }
        return <UploadPage />;
      case 'preview':
        if (userStatus === 'guest') {
          setCurrentPage('login');
          return <Dashboard userStatus={userStatus} />;
        }
        return <PreviewEditPage />;
      case 'account':
        if (userStatus === 'guest') {
          setCurrentPage('login');
          return <Dashboard userStatus={userStatus} />;
        }
        return <UserProfile />;
      case 'users':
        if (userStatus === 'guest') {
          setCurrentPage('login');
          return <Dashboard userStatus={userStatus} />;
        }
        return <AdminPage />;
      case 'help':
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
        return <Dashboard userStatus={userStatus} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Only show navigation if not on login page */}
      {currentPage !== 'login' && (
        <Navigation 
          currentPage={currentPage} 
          onPageChange={setCurrentPage}
          userStatus={userStatus}
          onShowLogin={() => setCurrentPage('login')}
        />
      )}
      <main className={currentPage === 'login' ? '' : 'max-w-7xl mx-auto'}>
        {renderCurrentPage()}
      </main>
    </div>
  );
}