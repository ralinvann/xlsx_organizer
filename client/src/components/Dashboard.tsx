import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { Users, Activity, AlertTriangle, TrendingUp, Calendar, MapPin, Lock, Eye, Download, RotateCw } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { api } from "../lib/api";

interface DashboardProps {
  userStatus: "guest" | "authenticated";
  onLoginClick?: () => void;
}

const MONTHS = [
  { value: "JANUARI", label: "Januari" },
  { value: "FEBRUARI", label: "Februari" },
  { value: "MARET", label: "Maret" },
  { value: "APRIL", label: "April" },
  { value: "MEI", label: "Mei" },
  { value: "JUNI", label: "Juni" },
  { value: "JULI", label: "Juli" },
  { value: "AGUSTUS", label: "Agustus" },
  { value: "SEPTEMBER", label: "September" },
  { value: "OKTOBER", label: "Oktober" },
  { value: "NOVEMBER", label: "November" },
  { value: "DESEMBER", label: "Desember" },
];

export function Dashboard({ userStatus, onLoginClick }: DashboardProps) {
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [reportExists, setReportExists] = useState<boolean | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  const handleDialogOpen = () => {
    setShowReportDialog(true);
    setSelectedMonth("");
    setSelectedYear(currentYear.toString());
    setReportExists(null);
    setReportId(null);
    setErrorMsg(null);
  };

  const handleSearchReport = async () => {
    if (!selectedMonth || !selectedYear) {
      setErrorMsg("Pilih bulan dan tahun terlebih dahulu.");
      return;
    }

    setSearching(true);
    setErrorMsg(null);
    setReportId(null);

    try {
      const bulanTahun = `${selectedMonth} ${selectedYear}`;
      const { data } = await api.get("/elderly-reports");
      
      const matchingReport = data.items?.find((report: any) => {
        const reportBulanTahun = String(report.bulanTahun || "").trim();
        const searchBulanTahun = bulanTahun.trim();
        
        if (reportBulanTahun.toUpperCase() === searchBulanTahun.toUpperCase()) {
          return true;
        }
        
        const reportParts = reportBulanTahun.toUpperCase().split(/\s+/);
        const searchParts = searchBulanTahun.toUpperCase().split(/\s+/);
        
        return (
          reportParts.some(part => searchParts.some(sPart => sPart === part)) &&
          reportParts.some(part => /^\d{4}$/.test(part)) &&
          searchParts.some(part => /^\d{4}$/.test(part))
        );
      });

      if (matchingReport) {
        console.log("Report found:", matchingReport._id, matchingReport.bulanTahun);
        setReportId(matchingReport._id);
        setReportExists(true);
        console.log("State updated - reportExists: true, reportId:", matchingReport._id);
      } else {
        console.log("No matching report found for", bulanTahun);
        setReportExists(false);
        setReportId(null);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Gagal mencari laporan.";
      setErrorMsg(msg);
      setReportExists(null);
    } finally {
      setSearching(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!reportId) {
      setErrorMsg("Laporan tidak ditemukan.");
      return;
    }

    setDownloadLoading(true);
    setErrorMsg(null);

    try {
      const response = await api.get(`/elderly-reports/${reportId}/download`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Laporan_Bulanan_${selectedMonth}_${selectedYear}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      setShowReportDialog(false);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Gagal mengunduh laporan.";
      setErrorMsg(msg);
    } finally {
      setDownloadLoading(false);
    }
  };

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

        <Button 
          size="lg" 
          className="h-12 px-6 text-lg" 
          disabled={userStatus === "guest"}
          onClick={handleDialogOpen}
        >
          <Download className="w-5 h-5 mr-2" />
          Download Laporan Bulanan
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

      {/* Report Download Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">Download Laporan Bulanan</DialogTitle>
            <DialogDescription className="text-lg">
              Pilih bulan dan tahun laporan yang ingin diunduh
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-semibold">Bulan</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-11 text-lg">
                  <SelectValue placeholder="Pilih bulan..." />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value} className="text-base">
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold">Tahun</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-11 text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year} className="text-base">
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {errorMsg && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {errorMsg}
              </div>
            )}

            {reportExists === null && (
              <div className="text-sm text-muted-foreground text-center italic">
                Pilih bulan dan tahun, lalu tekan "Cari Laporan"
              </div>
            )}

            {reportExists === true && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
                ✓ Laporan tersedia dan siap untuk diunduh
              </div>
            )}

            {reportExists === false && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-600">
                ⚠ Laporan untuk bulan {selectedMonth} {selectedYear} belum tersedia
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-3 justify-end mt-6">
            <Button
              variant="outline"
              size="lg"
              className="h-11 px-6 text-base"
              onClick={() => setShowReportDialog(false)}
              disabled={searching || downloadLoading}
            >
              Batal
            </Button>

            <Button
              size="lg"
              className={`h-11 px-6 text-base ${
                reportExists === true 
                  ? "bg-green-600 hover:bg-green-700 text-white" 
                  : ""
              }`}
              onClick={reportExists === true ? handleDownloadReport : handleSearchReport}
              disabled={
                reportExists === true 
                  ? (!reportId || downloadLoading)
                  : (!selectedMonth || !selectedYear || searching || downloadLoading)
              }
            >
              {reportExists === true ? (
                downloadLoading ? (
                  <>
                    <RotateCw className="w-4 h-4 mr-2 animate-spin" />
                    Mengunduh...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Unduh Laporan Excel
                  </>
                )
              ) : (
                searching ? (
                  <>
                    <RotateCw className="w-4 h-4 mr-2 animate-spin" />
                    Mencari...
                  </>
                ) : (
                  "Cari Laporan"
                )
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
