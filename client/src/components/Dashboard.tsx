import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Users,
  Activity,
  AlertTriangle,
  TrendingUp,
  MapPin,
  Lock,
  Eye,
  Download,
  RotateCw,
} from "lucide-react";
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
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ResponsiveContainer,
} from "recharts";

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

interface DashboardData {
  totalPraLansia: number;
  totalLansia: number;
  totalLansiaRisti: number;
  screenedLansia: number;
  empowermentCount: number;
  independenceLevels: {
    A: number;
    B: number;
    C: number;
  };
  genderBreakdown: {
    male: number;
    female: number;
  };
}

const defaultDashboardData: DashboardData = {
  totalPraLansia: 0,
  totalLansia: 0,
  totalLansiaRisti: 0,
  screenedLansia: 0,
  empowermentCount: 0,
  independenceLevels: {
    A: 0,
    B: 0,
    C: 0,
  },
  genderBreakdown: {
    male: 0,
    female: 0,
  },
};

function compactNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

function percent(part: number, total: number): string {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function distribute(total: number, labels: string[]): Array<{ name: string; value: number }> {
  if (total <= 0) {
    return labels.map((name) => ({ name, value: 0 }));
  }
  const base = Math.floor(total / labels.length);
  const result = labels.map((name) => ({ name, value: base }));
  let remainder = total - base * labels.length;
  let index = 0;
  while (remainder > 0) {
    result[index].value += 1;
    remainder -= 1;
    index = (index + 1) % result.length;
  }
  return result;
}

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
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData>(defaultDashboardData);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setDashboardError(null);
      try {
        const { data } = await api.get<DashboardData>("/lwreports/dashboard");
        setDashboardData(data);
      } catch {
        try {
          const { data } = await api.get<DashboardData>("/elderly-reports/dashboard");
          setDashboardData(data);
        } catch (e: any) {
          const msg = e?.response?.data?.message || "Gagal memuat data dashboard.";
          setDashboardError(msg);
          setDashboardData(defaultDashboardData);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const elderlyMeasuredData = distribute(dashboardData.totalLansia, [
    "Sen",
    "Sel",
    "Rab",
    "Kam",
    "Jum",
    "Sab",
    "Min",
  ]);

  const interventionData = distribute(dashboardData.screenedLansia, [
    "Minggu 1",
    "Minggu 2",
    "Minggu 3",
    "Minggu 4",
  ]);

  const urgentCasesData = distribute(dashboardData.totalLansiaRisti, [
    "Sen",
    "Sel",
    "Rab",
    "Kam",
    "Jum",
    "Sab",
    "Min",
  ]);

  const healthImprovementData = [
    { name: "A", value: dashboardData.independenceLevels.A },
    { name: "B", value: dashboardData.independenceLevels.B },
    { name: "C", value: dashboardData.independenceLevels.C },
  ];

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

      {dashboardError && (
        <Alert className="bg-red-50 border-red-200">
          <AlertDescription className="text-red-700">{dashboardError}</AlertDescription>
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
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-muted-foreground">Jumlah Lansia Diukur</CardTitle>
              <div className="p-3 rounded-full bg-secondary">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1">
              {loading ? "..." : compactNumber(dashboardData.totalLansia)}
            </div>
            <p className="text-sm text-muted-foreground mb-3">Total lansia (&gt;= 60 tahun)</p>
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={elderlyMeasuredData}>
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-muted-foreground">Intervensi Dilakukan</CardTitle>
              <div className="p-3 rounded-full bg-secondary">
                <Activity className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1">
              {loading ? "..." : compactNumber(dashboardData.screenedLansia)}
            </div>
            <p className="text-sm text-muted-foreground mb-3">Skrining lansia (distinct NIK)</p>
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={interventionData}>
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow relative">
          {userStatus === "guest" && (
            <div className="absolute top-2 right-2 z-10">
              <Lock className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-muted-foreground">Kasus Mendesak</CardTitle>
              <div className="p-3 rounded-full bg-secondary">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1">
              {userStatus === "guest" ? "***" : loading ? "..." : compactNumber(dashboardData.totalLansiaRisti)}
            </div>
            <p className="text-sm text-muted-foreground mb-3">Lansia risiko tinggi (&gt;= 70 tahun)</p>
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={urgentCasesData}>
                <defs>
                  <linearGradient id="urgentGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  fill="url(#urgentGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-muted-foreground">Peningkatan Kesehatan</CardTitle>
              <div className="p-3 rounded-full bg-secondary">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1">
              {loading ? "..." : percent(dashboardData.independenceLevels.A, dashboardData.totalLansia)}
            </div>
            <p className="text-sm text-muted-foreground mb-3">Kemandirian level A dari total lansia</p>
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={healthImprovementData}>
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl">Download Laporan Bulanan</DialogTitle>
            <DialogDescription className="text-base">
              Pilih bulan dan tahun laporan yang ingin diunduh
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Bulan</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Pilih bulan..." />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tahun</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            {reportExists === null && (
              <div className="p-3 bg-muted/50 border border-muted rounded-md text-sm text-muted-foreground text-center">
                Pilih bulan dan tahun, lalu tekan "Cari Laporan"
              </div>
            )}

            {reportExists === true && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700 flex items-center gap-2">
                <span className="text-base">✓</span>
                <span>Laporan tersedia dan siap untuk diunduh</span>
              </div>
            )}

            {reportExists === false && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700 flex items-center gap-2">
                <span className="text-base">⚠</span>
                <span>Laporan untuk bulan {selectedMonth} {selectedYear} belum tersedia</span>
              </div>
            )}
          </div>

          <DialogFooter className="flex-row gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="lg"
              className="flex-1 h-11"
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
