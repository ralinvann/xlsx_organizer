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
  Heart,
  ClipboardCheck,
  UserCheck,
  BarChart3,
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
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { Progress } from "./ui/progress";

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
  totalReports?: number;
  totalRowsScanned?: number;
  validRowsScanned?: number;
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
  totalReports: 0,
  totalRowsScanned: 0,
  validRowsScanned: 0,
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

function percentValue(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  secondary: "#10b981",
  tertiary: "#f59e0b",
  accent: "#ec4899",
  muted: "#94a3b8",
};

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

  // Calculate aggregated statistics for the new sections
  const totalElderlyRecorded = dashboardData.totalPraLansia + dashboardData.totalLansia;
  const totalServicesDelivered = dashboardData.screenedLansia + dashboardData.empowermentCount;
  const penyuluhanPercentage = percentValue(dashboardData.screenedLansia, totalElderlyRecorded);
  const pemberdayaanPercentage = percentValue(dashboardData.empowermentCount, totalElderlyRecorded);

  // Service coverage data
  const serviceCoverageData = [
    { name: "Penyuluhan", value: dashboardData.screenedLansia, fill: CHART_COLORS.primary },
    { name: "Pemberdayaan", value: dashboardData.empowermentCount, fill: CHART_COLORS.secondary },
  ];

  // Service distribution for donut chart
  const receivedBoth = Math.min(dashboardData.screenedLansia, dashboardData.empowermentCount);
  const receivedOne = Math.abs(dashboardData.screenedLansia - dashboardData.empowermentCount);
  const receivedNone = Math.max(0, totalElderlyRecorded - dashboardData.screenedLansia - receivedOne);

  const serviceDistributionData = [
    { name: "Kedua Layanan", value: receivedBoth, fill: CHART_COLORS.primary },
    { name: "Satu Layanan", value: receivedOne, fill: CHART_COLORS.tertiary },
    { name: "Belum Dilayani", value: receivedNone, fill: CHART_COLORS.muted },
  ];

  // Program impact metrics
  const atLeastOneServicePercentage = percentValue(
    totalElderlyRecorded - receivedNone,
    totalElderlyRecorded
  );
  const bothServicesPercentage = percentValue(receivedBoth, totalElderlyRecorded);

  // Activity summary metrics
  const totalServiceInteractions = dashboardData.screenedLansia + dashboardData.empowermentCount;
  const averageServicesPerPerson = totalElderlyRecorded > 0 
    ? (totalServiceInteractions / totalElderlyRecorded).toFixed(2) 
    : "0.00";

  const elderlyMeasuredData = [
    { name: "Pra Lansia", value: dashboardData.totalPraLansia },
    { name: "Lansia", value: dashboardData.totalLansia },
    { name: "Risti", value: dashboardData.totalLansiaRisti },
  ];

  const interventionData = [
    { name: "Skrining", value: dashboardData.screenedLansia },
    { name: "Pemberdayaan", value: dashboardData.empowermentCount },
  ];

  const urgentCasesData = [
    { name: "Laki-laki", value: dashboardData.genderBreakdown.male },
    { name: "Perempuan", value: dashboardData.genderBreakdown.female },
  ];

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

  function getProgressColor(value: number): string {
    if (value >= 70) return "bg-green-500";
    if (value >= 40) return "bg-yellow-500";
    return "bg-red-500";
  }

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

      {/* NEW: Hero Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-md hover:shadow-lg transition-shadow border-l-4 border-l-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Lansia Tercatat</p>
                <p className="text-4xl font-bold text-primary">
                  {loading ? "..." : compactNumber(totalElderlyRecorded)}
                </p>
              </div>
              <div className="p-4 rounded-full bg-primary/10">
                <Users className="w-8 h-8 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Layanan Diberikan</p>
                <p className="text-4xl font-bold text-green-600">
                  {loading ? "..." : compactNumber(totalServicesDelivered)}
                </p>
              </div>
              <div className="p-4 rounded-full bg-green-100">
                <Heart className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Menerima Penyuluhan</p>
                <p className="text-4xl font-bold text-blue-600">
                  {loading ? "..." : `${penyuluhanPercentage}%`}
                </p>
              </div>
              <div className="p-4 rounded-full bg-blue-100">
                <ClipboardCheck className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Menerima Pemberdayaan</p>
                <p className="text-4xl font-bold text-purple-600">
                  {loading ? "..." : `${pemberdayaanPercentage}%`}
                </p>
              </div>
              <div className="p-4 rounded-full bg-purple-100">
                <UserCheck className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NEW: Service Coverage Section */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Cakupan Layanan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* LEFT: Bar Chart */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Total Layanan per Kategori</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={serviceCoverageData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {serviceCoverageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-xs text-muted-foreground">Penyuluhan</p>
                  <p className="text-2xl font-bold">{compactNumber(dashboardData.screenedLansia)}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <p className="text-xs text-muted-foreground">Pemberdayaan</p>
                  <p className="text-2xl font-bold">{compactNumber(dashboardData.empowermentCount)}</p>
                </div>
              </div>
            </div>

            {/* RIGHT: Donut Chart */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Distribusi Penerima Layanan</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={serviceDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {serviceDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="p-2 bg-primary/10 rounded">
                  <p className="text-xs text-muted-foreground">Kedua</p>
                  <p className="text-lg font-bold">{compactNumber(receivedBoth)}</p>
                </div>
                <div className="p-2 bg-yellow-100 rounded">
                  <p className="text-xs text-muted-foreground">Satu</p>
                  <p className="text-lg font-bold">{compactNumber(receivedOne)}</p>
                </div>
                <div className="p-2 bg-gray-100 rounded">
                  <p className="text-xs text-muted-foreground">Belum</p>
                  <p className="text-lg font-bold">{compactNumber(receivedNone)}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NEW: Program Impact Section */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            Dampak Program
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium">Lansia Menerima Minimal Satu Layanan</p>
                <span className={`text-lg font-bold ${atLeastOneServicePercentage >= 70 ? 'text-green-600' : atLeastOneServicePercentage >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {atLeastOneServicePercentage}%
                </span>
              </div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${getProgressColor(atLeastOneServicePercentage)}`}
                  style={{ width: `${atLeastOneServicePercentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {compactNumber(totalElderlyRecorded - receivedNone)} dari {compactNumber(totalElderlyRecorded)} lansia
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium">Lansia Menerima Kedua Layanan</p>
                <span className={`text-lg font-bold ${bothServicesPercentage >= 70 ? 'text-green-600' : bothServicesPercentage >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {bothServicesPercentage}%
                </span>
              </div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${getProgressColor(bothServicesPercentage)}`}
                  style={{ width: `${bothServicesPercentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {compactNumber(receivedBoth)} dari {compactNumber(totalElderlyRecorded)} lansia
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Cakupan Tinggi</p>
                <p className="text-2xl font-bold text-green-600">≥ 70%</p>
                <p className="text-xs text-muted-foreground mt-1">Target Optimal</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Cakupan Sedang</p>
                <p className="text-2xl font-bold text-yellow-600">40-69%</p>
                <p className="text-xs text-muted-foreground mt-1">Perlu Peningkatan</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Cakupan Rendah</p>
                <p className="text-2xl font-bold text-red-600">&lt; 40%</p>
                <p className="text-xs text-muted-foreground mt-1">Perlu Perhatian</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NEW: Activity Summary Section */}
      <Card className="shadow-md bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Activity className="w-6 h-6" />
            Ringkasan Aktivitas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow">
              <div className="p-3 bg-blue-100 rounded-full">
                <ClipboardCheck className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Interaksi Layanan</p>
                <p className="text-2xl font-bold">{compactNumber(totalServiceInteractions)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow">
              <div className="p-3 bg-purple-100 rounded-full">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rata-rata Layanan/Orang</p>
                <p className="text-2xl font-bold">{averageServicesPerPerson}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow">
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Kemandirian Level A</p>
                <p className="text-2xl font-bold">{percent(dashboardData.independenceLevels.A, dashboardData.totalLansia)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Total Laporan</p>
          <p className="text-xl font-semibold">{loading ? "..." : compactNumber(dashboardData.totalReports ?? 0)}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Total Baris</p>
          <p className="text-xl font-semibold">{loading ? "..." : compactNumber(dashboardData.totalRowsScanned ?? 0)}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Baris Valid</p>
          <p className="text-xl font-semibold">{loading ? "..." : compactNumber(dashboardData.validRowsScanned ?? 0)}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Pra Lansia</p>
          <p className="text-xl font-semibold">{loading ? "..." : compactNumber(dashboardData.totalPraLansia)}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Pemberdayaan</p>
          <p className="text-xl font-semibold">{loading ? "..." : compactNumber(dashboardData.empowermentCount)}</p>
        </div>
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
            <p className="text-sm text-muted-foreground mb-3">Skrining + pemberdayaan (distinct NIK)</p>
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
            <p className="text-sm text-muted-foreground mb-3">Distribusi gender pada data valid</p>
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

      {/* NEW: CTA for Non-Logged-In Users */}
      {userStatus === "guest" && (
        <Card className="shadow-md bg-gradient-to-r from-primary/10 to-blue-100 border-primary/30">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-white rounded-full shadow">
                  <Lock className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">Akses Penuh Tersedia</h3>
                  <p className="text-muted-foreground">
                    Login untuk mengelola dan mengupload data perawatan lansia bulanan
                  </p>
                </div>
              </div>
              <Button 
                size="lg" 
                className="h-12 px-8 text-lg whitespace-nowrap"
                onClick={() => onLoginClick?.()}
              >
                <Lock className="w-5 h-5 mr-2" />
                Login Sekarang
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
