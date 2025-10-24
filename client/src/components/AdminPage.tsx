import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Users, Shield, Activity, Search, UserPlus, Settings, Eye, Edit3, Trash2 } from "lucide-react";
import { AddUserDialog } from "./AddUserDialog";

export function AdminPage() {
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const users = [
    {
      id: 1,
      name: "Dr. Sarah Wijaya",
      email: "sarah.wijaya@medicare.id",
      role: "Perawat Senior",
      status: "Aktif",
      lastLogin: "2 menit yang lalu",
      patients: 1247
    },
    {
      id: 2,
      name: "Dr. Ahmad Rahman",
      email: "ahmad.rahman@medicare.id",
      role: "Dokter",
      status: "Aktif",
      lastLogin: "1 jam yang lalu",
      patients: 892
    },
    {
      id: 3,
      name: "Siti Nurhaliza",
      email: "siti.nurhaliza@medicare.id",
      role: "Perawat",
      status: "Nonaktif",
      lastLogin: "3 hari yang lalu",
      patients: 634
    },
    {
      id: 4,
      name: "Budi Santoso",
      email: "budi.santoso@medicare.id",
      role: "Admin",
      status: "Aktif",
      lastLogin: "30 menit yang lalu",
      patients: 0
    }
  ];

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

  const recentLogs = [
    {
      user: "Dr. Sarah Wijaya",
      action: "Upload data kesehatan",
      details: "45 record pasien baru",
      timestamp: "2 jam yang lalu",
      status: "success"
    },
    {
      user: "Dr. Ahmad Rahman",
      action: "Login sistem",
      details: "Akses dari IP 192.168.1.100",
      timestamp: "1 jam yang lalu",
      status: "info"
    },
    {
      user: "System",
      action: "Backup database",
      details: "Scheduled backup completed",
      timestamp: "6 jam yang lalu",
      status: "success"
    },
    {
      user: "Budi Santoso",
      action: "User management",
      details: "Created new user account",
      timestamp: "1 hari yang lalu",
      status: "success"
    }
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
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-lg">Pengguna</TableHead>
                  <TableHead className="text-lg">Role</TableHead>
                  <TableHead className="text-lg">Status</TableHead>
                  <TableHead className="text-lg">Pasien</TableHead>
                  <TableHead className="text-lg">Login Terakhir</TableHead>
                  <TableHead className="text-lg">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={`/placeholder-avatar-${user.id}.jpg`} />
                          <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-lg font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-sm px-3 py-1">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.status === "Aktif" ? "default" : "secondary"}
                        className="text-sm px-3 py-1"
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-lg">{user.patients}</TableCell>
                    <TableCell className="text-lg">{user.lastLogin}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
                <div className={`p-2 rounded-full ${
                  log.status === 'success' ? 'bg-green-100 text-green-600' :
                  log.status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
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