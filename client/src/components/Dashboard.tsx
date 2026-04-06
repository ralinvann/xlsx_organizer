import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Users,
  Activity,
  TrendingUp,
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
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
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
  totalReports?: number;
  totalRowsScanned?: number;
  validRowsScanned?: number;
  totalPraLansia: number;
  totalLansia: number;
  totalLansiaRisti: number;
  screenedLansia: number;
  empowermentCount: number;
  independenceLevels: { A: number; B: number; C: number };
  genderBreakdown: { male: number; female: number };
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
  independenceLevels: { A: 0, B: 0, C: 0 },
  genderBreakdown: { male: 0, female: 0 },
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
  const [dialogMode, setDialogMode] = useState<"monthly" | "annual">("monthly");
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

  const totalElderlyRecorded = dashboardData.totalPraLansia + dashboardData.totalLansia;
  const totalServicesDelivered = dashboardData.screenedLansia + dashboardData.empowermentCount;
  const penyuluhanPercentage = percentValue(dashboardData.screenedLansia, totalElderlyRecorded);
  const pemberdayaanPercentage = percentValue(dashboardData.empowermentCount, totalElderlyRecorded);

  const serviceCoverageData = [
    { name: "Penyuluhan", value: dashboardData.screenedLansia, fill: CHART_COLORS.primary },
    { name: "Pemberdayaan", value: dashboardData.empowermentCount, fill: CHART_COLORS.secondary },
  ];

  const receivedBoth = Math.min(dashboardData.screenedLansia, dashboardData.empowermentCount);
  const receivedOne = Math.abs(dashboardData.screenedLansia - dashboardData.empowermentCount);
  const receivedNone = Math.max(0, totalElderlyRecorded - dashboardData.screenedLansia - receivedOne);

  const serviceDistributionData = [
    { name: "Kedua Layanan", value: receivedBoth, fill: CHART_COLORS.primary },
    { name: "Satu Layanan", value: receivedOne, fill: CHART_COLORS.tertiary },
    { name: "Belum Dilayani", value: receivedNone, fill: CHART_COLORS.muted },
  ];

  const atLeastOneServicePercentage = percentValue(totalElderlyRecorded - receivedNone, totalElderlyRecorded);
  const bothServicesPercentage = percentValue(receivedBoth, totalElderlyRecorded);
  const totalServiceInteractions = dashboardData.screenedLansia + dashboardData.empowermentCount;
  const averageServicesPerPerson = totalElderlyRecorded > 0
    ? (totalServiceInteractions / totalElderlyRecorded).toFixed(2)
    : "0.00";

  const handleDialogOpen = () => {
    setShowReportDialog(true);
    setDialogMode("monthly");
    setSelectedMonth("");
    setSelectedYear(currentYear.toString());
    setReportExists(null);
    setReportId(null);
    setErrorMsg(null);
  };

  const triggerBlobDownload = (data: BlobPart, fileName: string) => {
    const url = window.URL.createObjectURL(new Blob([data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadAnnual = async () => {
    if (!selectedYear) { setErrorMsg("Pilih tahun terlebih dahulu."); return; }
    setDownloadLoading(true);
    setErrorMsg(null);
    try {
      const responseA = await api.get(
        `/elderly-reports/annual/${selectedYear}/report-a`,
        { responseType: "blob" },
      );
      triggerBlobDownload(responseA.data, `Laporan_A_${selectedYear}.xlsx`);

      const responseB = await api.get(
        `/elderly-reports/annual/${selectedYear}/report-b`,
        { responseType: "blob" },
      );
      triggerBlobDownload(responseB.data, `Laporan_B_${selectedYear}.xlsx`);
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || e?.message || "Gagal mengunduh laporan.");
    } finally {
      setDownloadLoading(false);
    }
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
        return reportBulanTahun.toUpperCase() === bulanTahun.toUpperCase();
      });
      if (matchingReport) {
        setReportId(matchingReport._id);
        setReportExists(true);
      } else {
        setReportExists(false);
        setReportId(null);
      }
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || e?.message || "Gagal mencari laporan.");
      setReportExists(null);
    } finally {
      setSearching(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!reportId) { setErrorMsg("Laporan tidak ditemukan."); return; }
    setDownloadLoading(true);
    setErrorMsg(null);
    try {
      const response = await api.get(`/elderly-reports/${reportId}/download`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Laporan_Bulanan_${selectedMonth}_${selectedYear}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      setShowReportDialog(false);
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || e?.message || "Gagal mengunduh laporan.");
    } finally {
      setDownloadLoading(false);
    }
  };

  function getProgressColor(value: number): string {
    if (value >= 70) return "bg-green-500";
    if (value >= 40) return "bg-yellow-500";
    return "bg-red-500";
  }

  const btnAnim = "transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]";

  return (
    <div className="p-6 space-y-6">
      {userStatus === "guest" && (
        <Alert className="bg-blue-50 border-blue-200">
          <Eye className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm">
            Anda sedang dalam mode guest. Beberapa data dibatasi untuk melindungi privasi pasien.
            <Button variant="link" className="p-0 h-auto ml-1 text-blue-600" onClick={() => onLoginClick?.()}>
              Login untuk akses penuh
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {dashboardError && (
        <Alert className="bg-red-50 border-red-200">
          <AlertDescription className="text-red-700 text-sm">{dashboardError}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Dashboard Utama</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Ringkasan aktivitas kesehatan lansia hari ini
            {userStatus === "guest" && (
              <Badge variant="outline" className="ml-2 text-xs">
                <Eye className="w-3 h-3 mr-1" />
                Guest View
              </Badge>
            )}
          </p>
        </div>
        <Button
          disabled={userStatus === "guest"}
          onClick={handleDialogOpen}
          className={`gap-2 ${btnAnim}`}
        >
          <Download className="w-4 h-4" />
          Download Laporan
          {userStatus === "guest" && <Lock className="w-3 h-3 ml-1" />}
        </Button>
      </div>

      {/* Hero Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-foreground">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Lansia Tercatat</p>
                <p className="text-2xl" style={{ fontWeight: 700 }}>{loading ? "..." : compactNumber(totalElderlyRecorded)}</p>
              </div>
              <div className="p-3 rounded-full bg-muted">
                <Users className="w-6 h-6 text-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-green-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Layanan Diberikan</p>
                <p className="text-2xl text-green-600" style={{ fontWeight: 700 }}>{loading ? "..." : compactNumber(totalServicesDelivered)}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <Heart className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Menerima Penyuluhan</p>
                <p className="text-2xl text-blue-600" style={{ fontWeight: 700 }}>{loading ? "..." : `${penyuluhanPercentage}%`}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <ClipboardCheck className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-purple-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Menerima Pemberdayaan</p>
                <p className="text-2xl text-purple-600" style={{ fontWeight: 700 }}>{loading ? "..." : `${pemberdayaanPercentage}%`}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <UserCheck className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Coverage */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2" style={{ fontSize: "1.125rem" }}>
            <BarChart3 className="w-5 h-5" />
            Cakupan Layanan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm mb-3" style={{ fontWeight: 500 }}>Total Layanan per Kategori</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={serviceCoverageData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {serviceCoverageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="p-2.5 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Penyuluhan</p>
                  <p style={{ fontWeight: 600, fontSize: "1.125rem" }}>{compactNumber(dashboardData.screenedLansia)}</p>
                </div>
                <div className="p-2.5 bg-green-100 rounded-lg">
                  <p className="text-xs text-muted-foreground">Pemberdayaan</p>
                  <p style={{ fontWeight: 600, fontSize: "1.125rem" }}>{compactNumber(dashboardData.empowermentCount)}</p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm mb-3" style={{ fontWeight: 500 }}>Distribusi Penerima Layanan</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={serviceDistributionData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={5} dataKey="value">
                    {serviceDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="p-2 bg-muted rounded">
                  <p className="text-xs text-muted-foreground">Kedua</p>
                  <p style={{ fontWeight: 600 }}>{compactNumber(receivedBoth)}</p>
                </div>
                <div className="p-2 bg-yellow-100 rounded">
                  <p className="text-xs text-muted-foreground">Satu</p>
                  <p style={{ fontWeight: 600 }}>{compactNumber(receivedOne)}</p>
                </div>
                <div className="p-2 bg-gray-100 rounded">
                  <p className="text-xs text-muted-foreground">Belum</p>
                  <p style={{ fontWeight: 600 }}>{compactNumber(receivedNone)}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Program Impact */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2" style={{ fontSize: "1.125rem" }}>
            <TrendingUp className="w-5 h-5" />
            Dampak Program
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-sm">Lansia Menerima Minimal Satu Layanan</p>
                <span className={`text-sm ${atLeastOneServicePercentage >= 70 ? 'text-green-600' : atLeastOneServicePercentage >= 40 ? 'text-yellow-600' : 'text-red-600'}`} style={{ fontWeight: 600 }}>
                  {atLeastOneServicePercentage}%
                </span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-500 ${getProgressColor(atLeastOneServicePercentage)}`} style={{ width: `${atLeastOneServicePercentage}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {compactNumber(totalElderlyRecorded - receivedNone)} dari {compactNumber(totalElderlyRecorded)} lansia
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-sm">Lansia Menerima Kedua Layanan</p>
                <span className={`text-sm ${bothServicesPercentage >= 70 ? 'text-green-600' : bothServicesPercentage >= 40 ? 'text-yellow-600' : 'text-red-600'}`} style={{ fontWeight: 600 }}>
                  {bothServicesPercentage}%
                </span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-500 ${getProgressColor(bothServicesPercentage)}`} style={{ width: `${bothServicesPercentage}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {compactNumber(receivedBoth)} dari {compactNumber(totalElderlyRecorded)} lansia
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Cakupan Tinggi</p>
                <p className="text-green-600" style={{ fontSize: "1.25rem", fontWeight: 700 }}>&ge; 70%</p>
                <p className="text-xs text-muted-foreground mt-1">Target Optimal</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Cakupan Sedang</p>
                <p className="text-yellow-600" style={{ fontSize: "1.25rem", fontWeight: 700 }}>40-69%</p>
                <p className="text-xs text-muted-foreground mt-1">Perlu Peningkatan</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Cakupan Rendah</p>
                <p className="text-red-600" style={{ fontSize: "1.25rem", fontWeight: 700 }}>&lt; 40%</p>
                <p className="text-xs text-muted-foreground mt-1">Perlu Perhatian</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Summary */}
      <Card className="shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2" style={{ fontSize: "1.125rem" }}>
            <Activity className="w-5 h-5" />
            Ringkasan Aktivitas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm">
              <div className="p-2.5 bg-blue-100 rounded-full">
                <ClipboardCheck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Interaksi Layanan</p>
                <p style={{ fontSize: "1.25rem", fontWeight: 700 }}>{compactNumber(totalServiceInteractions)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm">
              <div className="p-2.5 bg-purple-100 rounded-full">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rata-rata Layanan/Orang</p>
                <p style={{ fontSize: "1.25rem", fontWeight: 700 }}>{averageServicesPerPerson}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm">
              <div className="p-2.5 bg-green-100 rounded-full">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Kemandirian Level A</p>
                <p style={{ fontSize: "1.25rem", fontWeight: 700 }}>{percent(dashboardData.independenceLevels.A, dashboardData.totalLansia)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Laporan", value: dashboardData.totalReports ?? 0 },
          { label: "Total Baris", value: dashboardData.totalRowsScanned ?? 0 },
          { label: "Baris Valid", value: dashboardData.validRowsScanned ?? 0 },
          { label: "Pra Lansia", value: dashboardData.totalPraLansia },
          { label: "Pemberdayaan", value: dashboardData.empowermentCount },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p style={{ fontSize: "1.125rem", fontWeight: 600 }}>{loading ? "..." : compactNumber(stat.value)}</p>
          </div>
        ))}
      </div>

      {/* Guest CTA */}
      {userStatus === "guest" && (
        <Card className="shadow-sm bg-gradient-to-r from-muted to-blue-50 border-border">
          <CardContent className="p-5">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-full shadow-sm">
                  <Lock className="w-6 h-6 text-foreground" />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: 600 }} className="mb-0.5">Akses Penuh Tersedia</h3>
                  <p className="text-sm text-muted-foreground">
                    Login untuk mengelola dan mengupload data perawatan lansia bulanan
                  </p>
                </div>
              </div>
              <Button onClick={() => onLoginClick?.()} className={`gap-2 whitespace-nowrap ${btnAnim}`}>
                <Lock className="w-4 h-4" />
                Login Sekarang
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Download Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="space-y-2">
            <DialogTitle style={{ fontSize: "1.25rem" }}>Download Laporan</DialogTitle>
            <DialogDescription className="text-sm">
              Pilih jenis laporan yang ingin diunduh
            </DialogDescription>
          </DialogHeader>

          {/* Mode toggle */}
          <div className="flex gap-2 pt-2">
            <Button
              variant={dialogMode === "monthly" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => { setDialogMode("monthly"); setErrorMsg(null); setReportExists(null); }}
            >
              Laporan Bulanan
            </Button>
            <Button
              variant={dialogMode === "annual" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => { setDialogMode("annual"); setErrorMsg(null); setReportExists(null); }}
            >
              Laporan Tahunan
            </Button>
          </div>

          {dialogMode === "monthly" && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm" style={{ fontWeight: 500 }}>Bulan</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Pilih bulan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm" style={{ fontWeight: 500 }}>Tahun</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{errorMsg}</div>
                )}
                {reportExists === null && (
                  <div className="p-3 bg-muted/50 border border-muted rounded-md text-sm text-muted-foreground text-center">
                    Pilih bulan dan tahun, lalu tekan "Cari Laporan"
                  </div>
                )}
                {reportExists === true && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700 flex items-center gap-2">
                    <span>&#10003;</span>
                    <span>Laporan tersedia dan siap untuk diunduh</span>
                  </div>
                )}
                {reportExists === false && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700 flex items-center gap-2">
                    <span>&#9888;</span>
                    <span>Laporan untuk bulan {selectedMonth} {selectedYear} belum tersedia</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {dialogMode === "annual" && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm" style={{ fontWeight: 500 }}>Tahun</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700">
                Mengunduh dua file: <strong>Laporan A</strong> (rekap per desa) dan <strong>Laporan B</strong> (daftar individu), masing-masing berisi 12 sheet per bulan.
              </div>
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{errorMsg}</div>
              )}
            </div>
          )}

          <DialogFooter className="flex-row gap-2">
            <Button
              variant="outline"
              className={`flex-1 ${btnAnim}`}
              onClick={() => setShowReportDialog(false)}
              disabled={searching || downloadLoading}
            >
              Batal
            </Button>

            {dialogMode === "monthly" && (
              <Button
                className={`${btnAnim} ${reportExists === true ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
                onClick={reportExists === true ? handleDownloadReport : handleSearchReport}
                disabled={
                  reportExists === true
                    ? (!reportId || downloadLoading)
                    : (!selectedMonth || !selectedYear || searching || downloadLoading)
                }
              >
                {reportExists === true ? (
                  downloadLoading ? (
                    <><RotateCw className="w-4 h-4 mr-2 animate-spin" />Mengunduh...</>
                  ) : (
                    <><Download className="w-4 h-4 mr-2" />Unduh Laporan Excel</>
                  )
                ) : (
                  searching ? (
                    <><RotateCw className="w-4 h-4 mr-2 animate-spin" />Mencari...</>
                  ) : "Cari Laporan"
                )}
              </Button>
            )}

            {dialogMode === "annual" && (
              <Button
                className={`flex-1 ${btnAnim}`}
                onClick={handleDownloadAnnual}
                disabled={!selectedYear || downloadLoading}
              >
                {downloadLoading ? (
                  <><RotateCw className="w-4 h-4 mr-2 animate-spin" />Mengunduh 2 file...</>
                ) : (
                  <><Download className="w-4 h-4 mr-2" />Unduh Laporan A & B</>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
