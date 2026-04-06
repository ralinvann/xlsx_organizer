import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Mail, Calendar, Activity, Edit3, Save, Upload, X, RefreshCcw } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";

const btnAnim = "transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]";

type ActivityStatus = "success" | "warning" | "info";
interface ActivityItem {
  _id: string;
  action: string;
  details: string;
  createdAt: string;
  status: ActivityStatus;
}

export function UserProfile() {
  const { user, ready, loading, updateProfile, uploadAvatar, fetchMe } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [workLocation, setWorkLocation] = useState("");
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activityHasMore, setActivityHasMore] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [serverMsg, setServerMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName ?? "");
    setMiddleName(user.middleName ?? "");
    setLastName(user.lastName ?? "");
    setPhone(user.phone ?? "");
    setWorkLocation(user.workLocation ?? "");
  }, [user]);

  const initials = useMemo(() => `${(user?.firstName || "?")[0] ?? "?"}${(user?.lastName || "")[0] ?? ""}`.toUpperCase(), [user]);
  const joinDate = useMemo(() => {
    if (!user?.createdAt) return "—";
    try { return new Date(user.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }); } catch { return "—"; }
  }, [user]);

  const statusClasses: Record<ActivityStatus, string> = {
    success: "bg-green-100 text-green-600",
    warning: "bg-yellow-100 text-yellow-600",
    info: "bg-blue-100 text-blue-600",
  };

  const statusByAction = (action: string): ActivityStatus => {
    if (["profile_update", "file_upload", "file_delete"].includes(action)) return "success";
    if (action === "logout") return "warning";
    return "info";
  };

  const actionLabel = (action: string): string => {
    switch (action) {
      case "login":
        return "Login ke sistem";
      case "logout":
        return "Logout dari sistem";
      case "profile_update":
        return "Update profil";
      case "file_upload":
        return "Upload file";
      case "file_delete":
        return "Hapus file";
      default:
        return action;
    }
  };

  const formatTimestamp = (iso: string): string => {
    try {
      return new Date(iso).toLocaleString("id-ID");
    } catch {
      return "-";
    }
  };

  const loadActivities = async (page: number, append = false) => {
    if (!user?.id) return;
    setActivityLoading(true);
    try {
      const { data } = await api.get("/activity-logs", { params: { page, limit: 10 } });
      const nextItems: ActivityItem[] = (Array.isArray(data?.items) ? data.items : []).map((item: any) => ({
        _id: String(item?._id ?? `${item?.action}-${item?.createdAt ?? Math.random()}`),
        action: String(item?.action ?? ""),
        details: String(item?.details ?? "-"),
        createdAt: String(item?.createdAt ?? ""),
        status: statusByAction(String(item?.action ?? "")),
      }));

      setActivities((prev) => (append ? [...prev, ...nextItems] : nextItems));
      setActivityPage(Number(data?.page) || page);
      setActivityHasMore(Boolean(data?.hasMore));
    } catch {
      if (!append) setActivities([]);
      setActivityHasMore(false);
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    if (!ready || !user?.id) return;
    void loadActivities(1, false);
  }, [ready, user?.id]);

  const handleSave = async () => {
    setServerMsg(null);
    if (!firstName.trim() || !lastName.trim()) { setServerMsg({ type: "err", text: "Nama depan dan belakang wajib diisi." }); return; }
    const res = await updateProfile({
      firstName: firstName.trim(),
      middleName: middleName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      workLocation: workLocation.trim(),
    });
    if (res.ok) { setServerMsg({ type: "ok", text: "Profil diperbarui." }); setIsEditing(false); }
    else setServerMsg({ type: "err", text: res.message || "Gagal memperbarui." });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setServerMsg(null);
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(f.type)) { setServerMsg({ type: "err", text: "Format tidak didukung." }); e.target.value = ""; return; }
    if (f.size > 5 * 1024 * 1024) { setServerMsg({ type: "err", text: "Max 5MB." }); e.target.value = ""; return; }
    const res = await uploadAvatar(f);
    if (res.ok) setServerMsg({ type: "ok", text: "Foto diperbarui." });
    else setServerMsg({ type: "err", text: res.message || "Gagal upload." });
    e.target.value = "";
  };

  if (!ready) return <div className="p-6 text-sm text-muted-foreground">Memuat profil...</div>;
  if (!user) return (
    <div className="p-6"><Card className="shadow-sm"><CardHeader><CardTitle>Profil</CardTitle></CardHeader><CardContent className="text-sm">Silakan login untuk melihat profil.</CardContent></Card></div>
  );

  const meta = {
    email: user.email,
    phone: user.phone || "",
    location: user.workLocation || "",
    lastActive: user.lastLoginAt ? formatTimestamp(user.lastLoginAt) : "—",
  };
  const displayName = [firstName, middleName, lastName].filter(Boolean).join(" ");

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>User Profile</h2>
          <p className="text-sm text-muted-foreground mt-1">Kelola informasi akun dan aktivitas Anda</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={loading} className={`gap-2 ${btnAnim}`}>
            <Upload className="w-4 h-4" /> Ganti Foto
          </Button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void handleAvatarChange(e)} />
          <Button variant="outline" onClick={() => void fetchMe()} disabled={loading} className={`gap-2 ${btnAnim}`}>
            <RefreshCcw className="w-4 h-4" /> Refresh
          </Button>
          <Button variant={isEditing ? "default" : "outline"} onClick={() => isEditing ? void handleSave() : setIsEditing(true)} disabled={loading} className={`gap-2 ${btnAnim}`}>
            {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            {isEditing ? "Simpan" : "Edit Profil"}
          </Button>
        </div>
      </div>

      {serverMsg && (
        <div className={`p-3 rounded-md flex items-center justify-between text-sm ${serverMsg.type === "ok" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          <span>{serverMsg.text}</span>
          <button onClick={() => setServerMsg(null)} className="p-1 rounded hover:bg-black/5"><X className="w-3 h-3" /></button>
        </div>
      )}

      <Card className="shadow-sm">
        <CardHeader className="pb-2"><CardTitle style={{ fontSize: "1.125rem" }}>Informasi Pribadi</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-5">
            <Avatar className="w-20 h-20">
              <AvatarImage src={user.profilePicture || ""} />
              <AvatarFallback style={{ fontSize: "1.25rem" }}>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 style={{ fontSize: "1.25rem", fontWeight: 600 }}>{displayName || "—"}</h3>
              <p className="text-sm text-muted-foreground capitalize">{String(user.role || "").toLowerCase()}</p>
              <Badge variant="secondary" className="mt-1 text-xs">Aktif</Badge>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { label: "Nama Depan", val: firstName, set: setFirstName, editable: true, span: "md:col-span-2" },
              { label: "Nama Tengah (opsional)", val: middleName, set: setMiddleName, editable: true, span: "md:col-span-2" },
              { label: "Nama Belakang", val: lastName, set: setLastName, editable: true, span: "md:col-span-2" },
              { label: "Telepon", val: phone, set: setPhone, editable: true, span: "" },
              { label: "Lokasi Kerja", val: workLocation, set: setWorkLocation, editable: true, span: "" },
            ].map(({ label, val, set, editable, span }, i) => (
              <div key={i} className={`space-y-1.5 ${span}`}>
                <Label className="text-sm">{label}</Label>
                {isEditing && editable ? (
                  <Input
                    className="h-10 bg-muted rounded-md ring-2 ring-green-500 ring-offset-1 focus:outline-none focus:ring-green-600"
                    value={val}
                    onChange={(e) => set(e.target.value)}
                  />
                ) : (
                  <p className="text-sm p-2.5 bg-muted rounded-md">{val || "—"}</p>
                )}
              </div>
            ))}
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-sm flex items-center gap-1.5"><Mail className="w-4 h-4" /> Email</Label>
              <p className="text-sm p-2.5 bg-muted rounded-md">{meta.email}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Bergabung Sejak</Label>
              <p className="text-sm p-2.5 bg-muted rounded-md">{joinDate}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1.5"><Activity className="w-4 h-4" /> Terakhir Aktif</Label>
              <p className="text-sm p-2.5 bg-muted rounded-md">{meta.lastActive}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2"><CardTitle style={{ fontSize: "1.125rem" }}>Activity Log</CardTitle></CardHeader>
        <CardContent>
          <div className="max-h-[360px] overflow-y-auto pr-1 space-y-3">
            {activities.length === 0 && !activityLoading && (
              <p className="text-sm text-muted-foreground text-center py-3">Belum ada aktivitas.</p>
            )}
            {activities.map((a) => (
              <div key={a._id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <div className={`p-1.5 rounded-full ${statusClasses[a.status]}`}><Activity className="w-4 h-4" /></div>
                <div className="flex-1">
                  <h4 className="text-sm" style={{ fontWeight: 600 }}>{actionLabel(a.action)}</h4>
                  <p className="text-xs text-muted-foreground">{a.details}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatTimestamp(a.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              className={btnAnim}
              onClick={() => void loadActivities(activityPage + 1, true)}
              disabled={!activityHasMore || activityLoading}
            >
              {activityLoading ? "Memuat..." : activityHasMore ? "Lihat Lebih Banyak" : "Tidak Ada Aktivitas Lain"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
