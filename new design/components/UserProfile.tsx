import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { User, Mail, Phone, MapPin, Calendar, Activity, Edit3, Save } from "lucide-react";
import { useState } from "react";

export function UserProfile() {
  const [isEditing, setIsEditing] = useState(false);

  const userInfo = {
    name: "Dr. Sarah Wijaya",
    role: "Perawat Senior",
    email: "sarah.wijaya@medicare.id",
    phone: "+62 812-3456-7890",
    location: "Puskesmas Cilandak, Jakarta Selatan",
    joinDate: "15 Januari 2020",
    patientCount: 1247,
    lastActive: "2 menit yang lalu"
  };

  const recentActivities = [
    {
      action: "Upload data kesehatan",
      details: "45 record pasien lansia",
      timestamp: "2 jam yang lalu",
      status: "success"
    },
    {
      action: "Update profil pasien",
      details: "Ibu Siti Aminah - Data tekanan darah",
      timestamp: "4 jam yang lalu",
      status: "success"
    },
    {
      action: "Login ke sistem",
      details: "Akses dari perangkat mobile",
      timestamp: "1 hari yang lalu",
      status: "info"
    },
    {
      action: "Generate laporan",
      details: "Laporan bulanan Oktober 2024",
      timestamp: "2 hari yang lalu",
      status: "success"
    },
    {
      action: "Validasi data",
      details: "Review 23 record dengan status warning",
      timestamp: "3 hari yang lalu",
      status: "warning"
    }
  ];

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-semibold">User Profile</h2>
          <p className="text-xl text-muted-foreground mt-2">
            Kelola informasi akun dan aktivitas Anda
          </p>
        </div>
        <Button 
          size="lg" 
          variant={isEditing ? "default" : "outline"}
          className="h-12 px-6 text-lg"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? <Save className="w-5 h-5 mr-2" /> : <Edit3 className="w-5 h-5 mr-2" />}
          {isEditing ? 'Simpan Perubahan' : 'Edit Profil'}
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-2xl">Informasi Pribadi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage src="/placeholder-avatar.jpg" />
                  <AvatarFallback className="text-2xl">SW</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold">{userInfo.name}</h3>
                  <p className="text-lg text-muted-foreground">{userInfo.role}</p>
                  <Badge className="mt-2 text-sm px-3 py-1">
                    Status: Aktif
                  </Badge>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-lg flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Email
                  </Label>
                  {isEditing ? (
                    <Input 
                      defaultValue={userInfo.email} 
                      className="h-12 text-lg"
                    />
                  ) : (
                    <p className="text-lg p-3 bg-muted rounded-md">{userInfo.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-lg flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Nomor Telepon
                  </Label>
                  {isEditing ? (
                    <Input 
                      defaultValue={userInfo.phone} 
                      className="h-12 text-lg"
                    />
                  ) : (
                    <p className="text-lg p-3 bg-muted rounded-md">{userInfo.phone}</p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Lokasi Kerja
                  </Label>
                  {isEditing ? (
                    <Input 
                      defaultValue={userInfo.location} 
                      className="h-12 text-lg"
                    />
                  ) : (
                    <p className="text-lg p-3 bg-muted rounded-md">{userInfo.location}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistics */}
        <div className="space-y-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-2xl">Statistik</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <div className="text-3xl font-bold text-primary">{userInfo.patientCount}</div>
                <div className="text-lg text-muted-foreground">Total Pasien</div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Bergabung sejak</p>
                    <p className="text-lg font-medium">{userInfo.joinDate}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Terakhir aktif</p>
                    <p className="text-lg font-medium">{userInfo.lastActive}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Activity Log */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                <div className={`p-2 rounded-full ${
                  activity.status === 'success' ? 'bg-green-100 text-green-600' :
                  activity.status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  <Activity className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold">{activity.action}</h4>
                  <p className="text-muted-foreground">{activity.details}</p>
                  <p className="text-sm text-muted-foreground mt-1">{activity.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Button variant="outline" size="lg" className="h-12 px-8 text-lg">
              Lihat Semua Aktivitas
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}