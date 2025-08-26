import React, { useState } from "react";
import {
  Box,
  Grid,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  Avatar,
  Chip,
  TextField,
  Divider,
} from "@mui/material";
import { Mail, Phone, MapPin, Calendar, Activity, Edit3, Save } from "lucide-react";

type ActivityStatus = "success" | "warning" | "info";

interface UserInfo {
  name: string;
  role: string;
  email: string;
  phone: string;
  location: string;
  joinDate: string;
  patientCount: number;
  lastActive: string;
}

interface RecentActivity {
  action: string;
  details: string;
  timestamp: string;
  status: ActivityStatus;
}

const statusColor = (status: ActivityStatus): "success" | "warning" | "info" => {
  if (status === "success") return "success";
  if (status === "warning") return "warning";
  return "info";
};

const Profile: React.FC = () => {
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const userInfo: UserInfo = {
    name: "Dr. Sarah Wijaya",
    role: "Perawat Senior",
    email: "sarah.wijaya@medicare.id",
    phone: "+62 812-3456-7890",
    location: "Puskesmas Cilandak, Jakarta Selatan",
    joinDate: "15 Januari 2020",
    patientCount: 1247,
    lastActive: "2 menit yang lalu",
  };

  const recentActivities: RecentActivity[] = [
    {
      action: "Upload data kesehatan",
      details: "45 record pasien lansia",
      timestamp: "2 jam yang lalu",
      status: "success",
    },
    {
      action: "Update profil pasien",
      details: "Ibu Siti Aminah - Data tekanan darah",
      timestamp: "4 jam yang lalu",
      status: "success",
    },
    {
      action: "Login ke sistem",
      details: "Akses dari perangkat mobile",
      timestamp: "1 hari yang lalu",
      status: "info",
    },
    {
      action: "Generate laporan",
      details: "Laporan bulanan Oktober 2024",
      timestamp: "2 hari yang lalu",
      status: "success",
    },
    {
      action: "Validasi data",
      details: "Review 23 record dengan status warning",
      timestamp: "3 hari yang lalu",
      status: "warning",
    },
  ];

  return (
    <Box p={3} display="flex" flexDirection="column" gap={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h4" fontWeight={600}>
            User Profile
          </Typography>
          <Typography variant="h6" color="text.secondary" mt={0.5}>
            Kelola informasi akun dan aktivitas Anda
          </Typography>
        </Box>

        <Button
          size="large"
          variant={isEditing ? "contained" : "outlined"}
          onClick={() => setIsEditing((v) => !v)}
          startIcon={isEditing ? <Save size={20} /> : <Edit3 size={20} />}
          sx={{ height: 48, px: 3, fontSize: 16 }}
        >
          {isEditing ? "Simpan Perubahan" : "Edit Profil"}
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Profile Information */}
        <Grid item xs={12} lg={8}>
          <Card elevation={3}>
            <CardHeader
              title={
                <Typography variant="h5" fontWeight={600}>
                  Informasi Pribadi
                </Typography>
              }
            />
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Avatar sx={{ width: 96, height: 96 }}>SW</Avatar>
                <Box flex={1}>
                  <Typography variant="h5" fontWeight={600}>
                    {userInfo.name}
                  </Typography>
                  <Typography variant="subtitle1" color="text.secondary">
                    {userInfo.role}
                  </Typography>
                  <Chip
                    label="Status: Aktif"
                    color="success"
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box mb={0.5} display="flex" alignItems="center" gap={1}>
                    <Mail size={18} />
                    <Typography variant="subtitle1">Email</Typography>
                  </Box>
                  {isEditing ? (
                    <TextField
                      defaultValue={userInfo.email}
                      fullWidth
                      size="medium"
                    />
                  ) : (
                    <Box p={1.5} borderRadius={1} bgcolor="action.hover">
                      <Typography>{userInfo.email}</Typography>
                    </Box>
                  )}
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box mb={0.5} display="flex" alignItems="center" gap={1}>
                    <Phone size={18} />
                    <Typography variant="subtitle1">Nomor Telepon</Typography>
                  </Box>
                  {isEditing ? (
                    <TextField
                      defaultValue={userInfo.phone}
                      fullWidth
                      size="medium"
                    />
                  ) : (
                    <Box p={1.5} borderRadius={1} bgcolor="action.hover">
                      <Typography>{userInfo.phone}</Typography>
                    </Box>
                  )}
                </Grid>

                <Grid item xs={12}>
                  <Box mb={0.5} display="flex" alignItems="center" gap={1}>
                    <MapPin size={18} />
                    <Typography variant="subtitle1">Lokasi Kerja</Typography>
                  </Box>
                  {isEditing ? (
                    <TextField
                      defaultValue={userInfo.location}
                      fullWidth
                      size="medium"
                    />
                  ) : (
                    <Box p={1.5} borderRadius={1} bgcolor="action.hover">
                      <Typography>{userInfo.location}</Typography>
                    </Box>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Statistics */}
        <Grid item xs={12} lg={4}>
          <Card elevation={3}>
            <CardHeader
              title={
                <Typography variant="h5" fontWeight={600}>
                  Statistik
                </Typography>
              }
            />
            <CardContent>
              <Box
                textAlign="center"
                p={2}
                borderRadius={2}
                sx={{ bgcolor: "primary.main", color: "primary.contrastText" }}
                mb={2}
              >
                <Typography variant="h4" fontWeight={700}>
                  {userInfo.patientCount}
                </Typography>
                <Typography variant="subtitle1">Total Pasien</Typography>
              </Box>

              <Box display="flex" flexDirection="column" gap={1.5}>
                <Box display="flex" alignItems="center" gap={1.5}>
                  <Calendar size={18} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Bergabung sejak
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {userInfo.joinDate}
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" alignItems="center" gap={1.5}>
                  <Activity size={18} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Terakhir aktif
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {userInfo.lastActive}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Activity Log */}
      <Card elevation={3}>
        <CardHeader
          title={
            <Typography variant="h5" fontWeight={600}>
              Activity Log
            </Typography>
          }
        />
        <CardContent>
          <Box display="flex" flexDirection="column" gap={2}>
            {recentActivities.map((activity, idx) => (
              <Box
                key={idx}
                display="flex"
                alignItems="flex-start"
                gap={2}
                p={2}
                borderRadius={2}
                sx={{ bgcolor: "action.selected" }}
              >
                <Chip
                  icon={<Activity size={16} />}
                  label={activity.status.toUpperCase()}
                  color={statusColor(activity.status)}
                  size="small"
                  variant="filled"
                  sx={{ minWidth: 100 }}
                />
                <Box flex={1}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {activity.action}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {activity.details}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                    {activity.timestamp}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box textAlign="center">
            <Button variant="outlined" size="large" sx={{ height: 48, px: 4 }}>
              Lihat Semua Aktivitas
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Profile;
