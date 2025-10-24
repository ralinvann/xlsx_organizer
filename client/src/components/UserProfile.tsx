import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Activity,
  Edit3,
  Save,
  Upload,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

/** Union type fixes the TS(2367) comparison error */
type ActivityStatus = "success" | "warning" | "info";

interface ActivityItem {
  action: string;
  details: string;
  timestamp: string;
  status: ActivityStatus;
}

export function UserProfile() {
  const { user, ready, loading, updateProfile, uploadAvatar, fetchMe } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [serverMsg, setServerMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName ?? "");
    setMiddleName(user.middleName ?? "");
    setLastName(user.lastName ?? "");
  }, [user]);

  const initials = useMemo(() => {
    const a = (user?.firstName || "?")[0] ?? "?";
    const b = (user?.lastName || "")[0] ?? "";
    return `${a}${b}`.toUpperCase();
  }, [user]);

  const joinDate = useMemo(() => {
    if (!user?.createdAt) return "—";
    try {
      const d = new Date(user.createdAt);
      return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
    } catch {
      return "—";
    }
  }, [user]);

  const handleSave = async () => {
    setServerMsg(null);
    const res = await updateProfile({ firstName, middleName, lastName });
    if (res.ok) {
      setServerMsg({ type: "ok", text: "Profil diperbarui." });
      setIsEditing(false);
    } else {
      setServerMsg({ type: "err", text: res.message || "Gagal memperbarui profil." });
    }
  };

  const handlePickAvatar = () => fileRef.current?.click();
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    setServerMsg(null);
    const file = e.target.files[0];
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) {
      setServerMsg({ type: "err", text: "Format gambar tidak didukung." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setServerMsg({ type: "err", text: "Ukuran file > 5MB." });
      return;
    }
    const res = await uploadAvatar(file);
    if (res.ok) setServerMsg({ type: "ok", text: "Foto profil diperbarui." });
    else setServerMsg({ type: "err", text: res.message || "Gagal upload avatar." });
    await fetchMe();
  };

  if (!ready) return <div className="p-6 text-muted-foreground">Memuat profil…</div>;
  if (!user) {
    return (
      <div className="p-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Profil</CardTitle>
          </CardHeader>
          <CardContent>Anda belum masuk. Silakan login untuk melihat profil.</CardContent>
        </Card>
      </div>
    );
  }

  const meta = {
    email: user.email,
    phone: "—",
    location: "—",
    patientCount: 0,
    lastActive: "—",
  };

  const recentActivities: ActivityItem[] = [
    { action: "Login ke sistem", details: "Berhasil", timestamp: "Baru saja", status: "info" },
    { action: "Update profil", details: "Nama diperbarui", timestamp: "Hari ini", status: "success" },
    { action: "Upload avatar", details: "Foto baru diunggah", timestamp: "2 hari lalu", status: "warning" },
  ];

  /** clean class mapping instead of chained conditionals */
  const statusClasses: Record<ActivityStatus, string> = {
    success: "bg-green-100 text-green-600",
    warning: "bg-yellow-100 text-yellow-600",
    info: "bg-blue-100 text-blue-600",
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-semibold">User Profile</h2>
          <p className="text-xl text-muted-foreground mt-2">
            Kelola informasi akun dan aktivitas Anda
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="lg"
            variant="outline"
            className="h-12 px-6 text-lg"
            onClick={handlePickAvatar}
            disabled={loading}
          >
            <Upload className="w-5 h-5 mr-2" />
            Ganti Foto
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <Button
            size="lg"
            variant={isEditing ? "default" : "outline"}
            className="h-12 px-6 text-lg"
            onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
            disabled={loading}
          >
            {isEditing ? <Save className="w-5 h-5 mr-2" /> : <Edit3 className="w-5 h-5 mr-2" />}
            {isEditing ? "Simpan Perubahan" : "Edit Profil"}
          </Button>
        </div>
      </div>

      {serverMsg && (
        <div
          className={`p-3 rounded-md ${
            serverMsg.type === "ok"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {serverMsg.text}
        </div>
      )}

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
                  <AvatarImage src={user.profilePicture || ""} />
                  <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold">
                    {[firstName, middleName, lastName].filter(Boolean).join(" ")}
                  </h3>
                  <p className="text-lg text-muted-foreground capitalize">{user.role}</p>
                  <Badge className="mt-2 text-sm px-3 py-1">Status: Aktif</Badge>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { label: "Nama Depan", val: firstName, set: setFirstName },
                  { label: "Nama Tengah (opsional)", val: middleName, set: setMiddleName },
                  { label: "Nama Belakang", val: lastName, set: setLastName },
                ].map(({ label, val, set }, i) => (
                  <div key={i} className="space-y-2 md:col-span-2">
                    <Label className="text-lg">{label}</Label>
                    {isEditing ? (
                      <Input className="h-12 text-lg" value={val} onChange={(e) => set(e.target.value)} />
                    ) : (
                      <p className="text-lg p-3 bg-muted rounded-md">{val || "—"}</p>
                    )}
                  </div>
                ))}

                <div className="space-y-2">
                  <Label className="text-lg flex items-center gap-2">
                    <Mail className="w-5 h-5" /> Email
                  </Label>
                  <p className="text-lg p-3 bg-muted rounded-md">{meta.email}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-lg flex items-center gap-2">
                    <Phone className="w-5 h-5" /> Nomor Telepon
                  </Label>
                  <p className="text-lg p-3 bg-muted rounded-md">{meta.phone}</p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5" /> Lokasi Kerja
                  </Label>
                  <p className="text-lg p-3 bg-muted rounded-md">{meta.location}</p>
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
                <div className="text-3xl font-bold text-primary">{meta.patientCount}</div>
                <div className="text-lg text-muted-foreground">Total Pasien</div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Bergabung sejak</p>
                    <p className="text-lg font-medium">{joinDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Terakhir aktif</p>
                    <p className="text-lg font-medium">{meta.lastActive}</p>
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
            {recentActivities.map((a, i) => (
              <div key={i} className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                <div className={`p-2 rounded-full ${statusClasses[a.status]}`}>
                  <Activity className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold">{a.action}</h4>
                  <p className="text-muted-foreground">{a.details}</p>
                  <p className="text-sm text-muted-foreground mt-1">{a.timestamp}</p>
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
