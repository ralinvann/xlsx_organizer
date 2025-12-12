import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { Users, Activity, AlertTriangle, TrendingUp, Calendar, MapPin, Lock, Eye } from "lucide-react";

interface DashboardProps {
  userStatus: "guest" | "authenticated";
  onLoginClick?: () => void;
}

export function Dashboard({ userStatus, onLoginClick }: DashboardProps) {
  const stats = [
    {
      title: "Jumlah Lansia Diukur",
      value: "14,500",
      subtitle: "Total bulan ini",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Intervensi Dilakukan",
      value: "892",
      subtitle: "Tindakan medis",
      icon: Activity,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Kasus Mendesak",
      value: userStatus === "guest" ? "***" : "23",
      subtitle: "Perlu perhatian",
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      restricted: userStatus === "guest",
    },
    {
      title: "Peningkatan Kesehatan",
      value: "78%",
      subtitle: "Dari bulan lalu",
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-green-50",
    },
  ];

  const recentActivities = [
    {
      patient: userStatus === "guest" ? "Ibu S***" : "Ibu Siti Aminah",
      action: "Pemeriksaan tekanan darah",
      status: "Normal",
      time: "2 jam yang lalu",
      location: "Puskesmas Cilandak",
      restricted: userStatus === "guest",
    },
    {
      patient: userStatus === "guest" ? "Bapak A***" : "Bapak Ahmad Yusuf",
      action: "Konsultasi diabetes",
      status: "Perlu tindak lanjut",
      time: "4 jam yang lalu",
      location: "RS Fatmawati",
      restricted: userStatus === "guest",
    },
    {
      patient: userStatus === "guest" ? "Ibu M***" : "Ibu Mariam",
      action: "Vaksinasi influenza",
      status: "Selesai",
      time: "6 jam yang lalu",
      location: "Puskesmas Kebayoran",
      restricted: userStatus === "guest",
    },
  ];

  return (
    <div className="p-6 space-y-8">
      {userStatus === "guest" && (
        <Alert className="bg-primary/10 border-primary/30">
          <Eye className="h-5 w-5 text-primary" />
          <AlertDescription className="text-lg">
            Anda sedang dalam mode guest. Beberapa data dibatasi untuk melindungi privasi pasien.
            <Button
              variant="link"
              className="p-0 h-auto ml-2 text-primary"
              onClick={() => onLoginClick?.()}
            >
              Login untuk akses penuh
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-semibold">Dashboard Utama</h2>
          <p className="text-xl text-muted-foreground mt-2">
            Ringkasan aktivitas kesehatan lansia hari ini
            {userStatus === "guest" && (
              <Badge variant="outline" className="ml-2">
                <Eye className="w-4 h-4 mr-1" />
                Guest View
              </Badge>
            )}
          </p>
        </div>

        <Button size="lg" className="h-12 px-6 text-lg" disabled={userStatus === "guest"}>
          <Calendar className="w-5 h-5 mr-2" />
          Lihat Laporan Bulanan
          {userStatus === "guest" && <Lock className="w-4 h-4 ml-2" />}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="shadow-md hover:shadow-lg transition-shadow relative">
              {stat.restricted && (
                <div className="absolute top-2 right-2">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-muted-foreground">{stat.title}</CardTitle>
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

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            Aktivitas Terbaru
            {userStatus === "guest" && (
              <Badge variant="outline" className="text-sm">
                Data Terbatas
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="border-l-4 border-primary pl-6 py-4 bg-secondary/30 rounded-r-lg relative">
                {activity.restricted && (
                  <div className="absolute top-2 right-2">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-xl font-semibold">{activity.patient}</h4>
                  <Badge
                    variant={activity.status === "Normal" || activity.status === "Selesai" ? "default" : "destructive"}
                    className="text-sm px-3 py-1"
                  >
                    {activity.status}
                  </Badge>
                </div>
                <p className="text-lg mb-2">{activity.action}</p>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span className="text-sm">{activity.time}</span>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{activity.location}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Button variant="outline" size="lg" className="h-12 px-8 text-lg" disabled={userStatus === "guest"}>
              Lihat Semua Aktivitas
              {userStatus === "guest" && <Lock className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
