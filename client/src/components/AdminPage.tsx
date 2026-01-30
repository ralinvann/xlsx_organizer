import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Users, Shield, Activity, Search, UserPlus, Settings, Eye, Edit3, Trash2, Loader, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { AddUserDialog } from "./AddUserDialog";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";

export function AdminPage() {
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [fetchedUsers, setFetchedUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { user, ready } = useAuth();

  // Strict allowed roles (normalize to uppercase)
  const ALLOWED_ROLES = new Set(["ADMIN", "SUPERADMIN"]);

  // Fetch users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.get("/users");
        setFetchedUsers(response.data);
      } catch (err: any) {
        console.error("Error fetching users:", err);
        setError(err.response?.data?.message || "Gagal memuat data pengguna");
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch if user is authorized
    if (ready && user && ALLOWED_ROLES.has(String(user.role || "").toUpperCase())) {
      fetchUsers();
    }
  }, [ready, user]);

  // Format user display name from first, middle, and last names
  const getFullName = (userData: any) => {
    const names = [];
    if (userData.firstName) names.push(userData.firstName);
    if (userData.middleName) names.push(userData.middleName);
    if (userData.lastName) names.push(userData.lastName);
    return names.join(" ") || "Unknown";
  };

  // Get initials for avatar fallback
  const getInitials = (userData: any) => {
    const fullName = getFullName(userData);
    return fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Filter and sort users
  const filteredAndSortedUsers = fetchedUsers
    .filter((userData) => {
      if (!searchTerm) return true;
      const fullName = getFullName(userData).toLowerCase();
      const email = userData.email?.toLowerCase() || "";
      const role = userData.role?.toLowerCase() || "";
      const searchLower = searchTerm.toLowerCase();
      return fullName.includes(searchLower) || email.includes(searchLower) || role.includes(searchLower);
    })
    .sort((a, b) => {
      if (!sortField) return 0;
      
      let aValue, bValue;
      switch (sortField) {
        case 'name':
          aValue = getFullName(a).toLowerCase();
          bValue = getFullName(b).toLowerCase();
          break;
        case 'email':
          aValue = a.email?.toLowerCase() || "";
          bValue = b.email?.toLowerCase() || "";
          break;
        case 'role':
          aValue = a.role?.toLowerCase() || "";
          bValue = b.role?.toLowerCase() || "";
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  // Handle sort click
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sort icon for a field
  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  // Action handlers
  const handleViewUser = (userData: any) => {
    // TODO: Implement view user functionality
    console.log('View user:', userData);
    alert(`Melihat detail pengguna: ${getFullName(userData)}`);
  };

  const handleEditUser = (userData: any) => {
    // TODO: Implement edit user functionality
    console.log('Edit user:', userData);
    alert(`Mengedit pengguna: ${getFullName(userData)}`);
  };

  const handleDeleteUser = async (userData: any) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus pengguna ${getFullName(userData)}?`)) {
      return;
    }
    
    try {
      await api.delete(`/users/${userData._id}`);
      setFetchedUsers(prev => prev.filter(u => u._id !== userData._id));
      alert('Pengguna berhasil dihapus');
    } catch (err: any) {
      console.error('Error deleting user:', err);
      alert('Gagal menghapus pengguna: ' + (err.response?.data?.message || 'Unknown error'));
    }
  };

  // Wait for auth to initialize
  if (!ready) return <div className="p-6 text-muted-foreground">Memuat data…</div>;

  // Not logged in
  if (!user) {
    return (
      <div className="p-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Akses Ditolak</CardTitle>
          </CardHeader>
          <CardContent>
            Anda belum masuk. Silakan login dengan akun yang memiliki hak akses untuk melihat panel admin.
          </CardContent>
        </Card>
      </div>
    );
  }

  // Strict role check
  const role = String(user.role || "").toUpperCase();
  const isAuthorized = ALLOWED_ROLES.has(role);
  if (!isAuthorized) {
    // Return an access denied card and do not render any admin data or components
    return (
      <div className="p-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Akses Ditolak</CardTitle>
          </CardHeader>
          <CardContent>
            Anda tidak memiliki izin untuk mengakses halaman ini. Jika Anda merasa ini sebuah kesalahan,
            hubungi administrator sistem.
          </CardContent>
        </Card>
      </div>
    );
  }

  // Use filtered and sorted users or empty array while loading
  const displayUsers = isLoading ? [] : filteredAndSortedUsers;

  const systemStats = [
    {
      title: "Total Pengguna",
      value: "24",
      subtitle: "4 aktif hari ini",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Data Lansia",
      value: "14,500",
      subtitle: "892 ditambah bulan ini",
      icon: Activity,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Akses Harian",
      value: "156",
      subtitle: "Login hari ini",
      icon: Eye,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      title: "Sistem",
      value: "99.9%",
      subtitle: "Uptime bulan ini",
      icon: Shield,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    }
  ];

  // Format last login info for logs
  const getLastLoginLogs = () => {
    return fetchedUsers
      .filter(user => user.lastLoginAt)
      .sort((a, b) => new Date(b.lastLoginAt!).getTime() - new Date(a.lastLoginAt!).getTime())
      .slice(0, 5) // Show only 5 most recent
      .map(user => ({
        user: getFullName(user),
        action: "Login sistem",
        details: `Akses dari IP ${user.lastLoginIP || 'unknown'}`,
        timestamp: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('id-ID') : 'Unknown',
        status: "info" as const,
        bgColor: "bg-blue-100",
        textColor: "text-blue-600"
      }));
  };

  const recentLogs = [
    ...getLastLoginLogs()
  ];

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-semibold">Admin Panel</h2>
          <p className="text-xl text-muted-foreground mt-2">
            Kelola pengguna, sistem, dan keamanan
          </p>
        </div>
        <div className="flex gap-3">
          {/* Only visible to authorized roles (already guaranteed by early-return above),
              kept as explicit guard in case of refactor */}
          <Button variant="outline" size="lg" className="h-12 px-6 text-lg">
            <Settings className="w-5 h-5 mr-2" />
            Pengaturan Sistem
          </Button>
          <Button 
            size="lg" 
            className="h-12 px-6 text-lg"
            onClick={() => setIsAddUserDialogOpen(true)}
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Tambah Pengguna
          </Button>
        </div>
      </div>
      
      {/* From here on the UI is only rendered for authorized users (see early return) */}

      {/* System Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {systemStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold mb-2">{stat.value}</div>
                <p className="text-lg text-muted-foreground">{stat.subtitle}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* User Management */}
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl">User Database</CardTitle>
            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input 
                  placeholder="Cari pengguna..." 
                  className="pl-10 h-10 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Memuat data pengguna...</span>
            </div>
          ) : displayUsers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Tidak ada pengguna ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-lg">
                      <Button 
                        variant="ghost" 
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                        onClick={() => handleSort('name')}
                      >
                        Pengguna
                        <span className="ml-2">{getSortIcon('name')}</span>
                      </Button>
                    </TableHead>
                    <TableHead className="text-lg">
                      <Button 
                        variant="ghost" 
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                        onClick={() => handleSort('email')}
                      >
                        Email
                        <span className="ml-2">{getSortIcon('email')}</span>
                      </Button>
                    </TableHead>
                    <TableHead className="text-lg">
                      <Button 
                        variant="ghost" 
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                        onClick={() => handleSort('role')}
                      >
                        Role
                        <span className="ml-2">{getSortIcon('role')}</span>
                      </Button>
                    </TableHead>
                    <TableHead className="text-lg">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayUsers.map((userData) => (
                    <TableRow key={userData._id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={userData.profilePicture} alt={getFullName(userData)} />
                            <AvatarFallback>{getInitials(userData)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-lg font-medium">{getFullName(userData)}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-lg">{userData.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-sm px-3 py-1 capitalize">
                          {userData.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => handleViewUser(userData)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => handleEditUser(userData)}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteUser(userData)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Logs */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">System Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentLogs.map((log, index) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                <div className={`p-2 rounded-full ${log.bgColor} ${log.textColor}`}>
                  <Activity className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-lg font-semibold">{log.action}</h4>
                    <Badge variant="outline" className="text-xs">
                      {log.user}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{log.details}</p>
                  <p className="text-sm text-muted-foreground mt-1">{log.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Button variant="outline" size="lg" className="h-12 px-8 text-lg">
              Lihat Semua Log
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <AddUserDialog 
        open={isAddUserDialogOpen} 
        onOpenChange={setIsAddUserDialogOpen}
      />
    </div>
  );
}