import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Alert,
  AlertTitle,
  Divider,
  Paper,
  Skeleton,
} from "@mui/material";
import {
  Users,
  Activity as ActivityIcon,
  AlertTriangle,
  TrendingUp,
  Calendar,
  MapPin,
  Lock,
  Eye,
} from "lucide-react";
import axios from "axios";

/** ===== Types (kept from your original) ===== */
interface Populasi {
  lakiLaki: number;
  perempuan: number;
  total: number;
}
interface Sasaran {
  kategori: string;
  populasi: Populasi;
}
interface Desa {
  desa: string;
  sasaran: Sasaran[];
  totalSasaran: number;
}
interface Puskesmas {
  name: string;
  kabupaten: string;
  desaList: Desa[];
}

/** ===== Optional prop: defaults to 'guest' if not provided ===== */
type UserStatus = "guest" | "authenticated";
interface DashboardProps {
  userStatus?: UserStatus;
}

const API_PRIMARY = "http://localhost:5000/api/puskesmas";

/** Try localhost:5000 first; if it fails, fall back to same-origin /api/puskesmas */
async function fetchPuskesmas(): Promise<Puskesmas[]> {
  try {
    const res = await axios.get<Puskesmas[]>(API_PRIMARY, { withCredentials: false });
    return res.data;
  } catch (err) {
    const fallback = `${window.location.origin.replace(/\/$/, "")}/api/puskesmas`;
    const res2 = await axios.get<Puskesmas[]>(fallback, { withCredentials: false });
    return res2.data;
  }
}

const Dashboard: React.FC<DashboardProps> = ({ userStatus = "guest" }) => {
  const [data, setData] = useState<Puskesmas[]>([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const d = await fetchPuskesmas();
        if (mounted) setData(d);
      } catch (e: any) {
        if (mounted) setErrMsg(e?.message || "Failed to load data");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /** Simple derived stats from API (fallback to zeros when no data yet) */
  const totals = useMemo(() => {
    const desa = data[0]?.desaList ?? [];
    let totalLansia = 0;
    desa.forEach((d) =>
      d.sasaran.forEach((s) => {
        totalLansia += s.populasi.total;
      })
    );
    return {
      measured: Intl.NumberFormat("id-ID").format(Math.round(totalLansia * 0.6)), // placeholder derived metric
      interventions: Intl.NumberFormat("id-ID").format(Math.max(0, Math.round(totalLansia * 0.03))),
      urgent: userStatus === "guest" ? "***" : `${Math.max(0, Math.round(totalLansia * 0.002))}`,
      healthImprovement: "78%",
    };
  }, [data, userStatus]);

  /** Example recent activities (redacted when guest) */
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

  const statCards = [
    {
      title: "Jumlah Lansia Diukur",
      value: totals.measured,
      subtitle: "Total bulan ini",
      icon: Users,
      color: "#1e88e5",
      bg: "rgba(30,136,229,0.1)",
    },
    {
      title: "Intervensi Dilakukan",
      value: totals.interventions,
      subtitle: "Tindakan medis",
      icon: ActivityIcon,
      color: "#2e7d32",
      bg: "rgba(46,125,50,0.1)",
    },
    {
      title: "Kasus Mendesak",
      value: totals.urgent,
      subtitle: "Perlu perhatian",
      icon: AlertTriangle,
      color: "#c62828",
      bg: "rgba(198,40,40,0.1)",
      restricted: userStatus === "guest",
    },
    {
      title: "Peningkatan Kesehatan",
      value: "78%",
      subtitle: "Dari bulan lalu",
      icon: TrendingUp,
      color: "#6a1b9a",
      bg: "rgba(106,27,154,0.1)",
    },
  ];

  return (
    <Box display="flex" flexGrow={1} bgcolor="#fff7f2">
      <Container maxWidth="xl" sx={{ py: 4, flexGrow: 1 }}>
        {/* Guest alert */}
        {userStatus === "guest" && (
          <Alert
            severity="info"
            sx={{
              mb: 3,
              border: "1px solid",
              borderColor: "primary.light",
              bgcolor: "primary.lighter",
            }}
            icon={<Eye size={18} />}
          >
            <AlertTitle>Mode Guest</AlertTitle>
            Beberapa data dibatasi untuk melindungi privasi pasien.
            <Button sx={{ ml: 1 }} variant="text" size="small">
              Login untuk akses penuh
            </Button>
          </Alert>
        )}

        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Dashboard Utama
            </Typography>
            <Box display="flex" alignItems="center" gap={1} mt={0.5}>
              <Typography variant="h6" color="text.secondary">
                Ringkasan aktivitas kesehatan lansia hari ini
              </Typography>
              {userStatus === "guest" && (
                <Chip
                  size="small"
                  variant="outlined"
                  icon={<Eye size={16} />}
                  label="Guest View"
                />
              )}
            </Box>
          </Box>
          <Button
            variant="contained"
            size="large"
            startIcon={<Calendar size={18} />}
            disabled={userStatus === "guest"}
          >
            Lihat Laporan Bulanan
            {userStatus === "guest" && <Lock size={16} style={{ marginLeft: 8 }} />}
          </Button>
        </Box>

        {/* Stat cards */}
        <Grid container spacing={3} mb={4}>
          {statCards.map((s, i) => {
            const Icon = s.icon;
            return (
              <Grid item xs={12} sm={6} lg={3} key={i}>
                <Card
                  elevation={3}
                  sx={{
                    borderRadius: 3,
                    position: "relative",
                    overflow: "hidden",
                    ":hover": { boxShadow: 6 },
                  }}
                >
                  {s.restricted && (
                    <Box position="absolute" top={8} right={8} color="text.disabled">
                      <Lock size={16} />
                    </Box>
                  )}
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                      <Typography variant="subtitle2" color="text.secondary">
                        {s.title}
                      </Typography>
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: "9999px",
                          bgcolor: s.bg,
                          display: "inline-flex",
                        }}
                      >
                        <Icon size={20} color={s.color} />
                      </Box>
                    </Box>
                    <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1.1 }}>
                      {loading ? <Skeleton width={80} /> : s.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {s.subtitle}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* Recent Activities */}
        <Card elevation={3} sx={{ borderRadius: 3, mb: 4 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Typography variant="h5" fontWeight={700}>
                Aktivitas Terbaru
              </Typography>
              {userStatus === "guest" && (
                <Chip size="small" variant="outlined" label="Data Terbatas" />
              )}
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Box display="flex" flexDirection="column" gap={2}>
              {recentActivities.map((a, idx) => (
                <Paper
                  key={idx}
                  variant="outlined"
                  sx={{
                    p: 2,
                    pl: 3,
                    borderLeft: (theme) => `4px solid ${theme.palette.primary.main}`,
                    borderRadius: 2,
                    position: "relative",
                    bgcolor: "action.hover",
                  }}
                >
                  {a.restricted && (
                    <Box position="absolute" top={8} right={8} color="text.disabled">
                      <Lock size={16} />
                    </Box>
                  )}
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={0.5}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {a.patient}
                    </Typography>
                    <Chip
                      size="small"
                      color={
                        a.status === "Normal" || a.status === "Selesai" ? "success" : "warning"
                      }
                      label={a.status}
                    />
                  </Box>
                  <Typography variant="body1" sx={{ mb: 0.5 }}>
                    {a.action}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={3} color="text.secondary">
                    <Typography variant="caption">{a.time}</Typography>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <MapPin size={14} />
                      <Typography variant="caption">{a.location}</Typography>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Box>
            <Box mt={3} textAlign="center">
              <Button variant="outlined" size="large" disabled={userStatus === "guest"}>
                Lihat Semua Aktivitas
                {userStatus === "guest" && <Lock size={16} style={{ marginLeft: 8 }} />}
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Data Table (kept; uses fetched API data) */}
        <Card elevation={3} sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h5" fontWeight={700} textAlign="center" mb={2}>
              Detail Sasaran Lansia per Desa
            </Typography>
            {loading ? (
              <Skeleton variant="rounded" height={240} />
            ) : errMsg ? (
              <Alert severity="error">{errMsg}</Alert>
            ) : data.length === 0 ? (
              <Typography>Tidak ada data.</Typography>
            ) : (
              <Box sx={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#fcd2b6" }}>
                      <th style={{ padding: 12, border: "1px solid #ddd", textAlign: "left" }}>
                        Desa
                      </th>
                      <th style={{ padding: 12, border: "1px solid #ddd", textAlign: "left" }}>
                        Kategori
                      </th>
                      <th style={{ padding: 12, border: "1px solid #ddd" }}>Laki-laki</th>
                      <th style={{ padding: 12, border: "1px solid #ddd" }}>Perempuan</th>
                      <th style={{ padding: 12, border: "1px solid #ddd" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data[0].desaList.map((desa) =>
                      desa.sasaran.map((sasaran, idx) => (
                        <tr key={`${desa.desa}-${idx}`}>
                          <td style={{ padding: 10, border: "1px solid #ddd" }}>
                            {idx === 0 ? desa.desa : ""}
                          </td>
                          <td style={{ padding: 10, border: "1px solid #ddd" }}>
                            {sasaran.kategori}
                          </td>
                          <td style={{ padding: 10, border: "1px solid #ddd", textAlign: "right" }}>
                            {sasaran.populasi.lakiLaki}
                          </td>
                          <td style={{ padding: 10, border: "1px solid #ddd", textAlign: "right" }}>
                            {sasaran.populasi.perempuan}
                          </td>
                          <td style={{ padding: 10, border: "1px solid #ddd", textAlign: "right" }}>
                            {sasaran.populasi.total}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default Dashboard;
