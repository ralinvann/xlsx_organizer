import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Upload, User, X, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

const btnAnim = "transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]";

interface AddUserDialogProps { open: boolean; onOpenChange: (open: boolean) => void }

export function AddUserDialog({ open, onOpenChange, onSuccess }: AddUserDialogProps & { onSuccess?: (createdUser?: any) => void }) {
  const { user: authUser } = useAuth();
  const isSuperadmin = String(authUser?.role || "").toUpperCase().trim() === "SUPERADMIN";

  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("");
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => { setFirstName(""); setMiddleName(""); setLastName(""); setEmail(""); setPassword(""); setRole(""); setShowPassword(false); setProfilePicture(null); if (fileInputRef.current) fileInputRef.current.value = ""; };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB."); return; }
    if (!file.type.startsWith("image/")) { toast.error("File harus gambar."); return; }
    const reader = new FileReader();
    reader.onloadend = () => setProfilePicture(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) { toast.error("Nama depan wajib."); return; }
    if (!lastName.trim()) { toast.error("Nama belakang wajib."); return; }
    if (!email.includes("@")) { toast.error("Email tidak valid."); return; }
    if (password.length < 8) { toast.error("Password minimal 8 karakter."); return; }
    if (!role) { toast.error("Role wajib dipilih."); return; }
    if (!isSuperadmin && (role === "admin" || role === "superadmin")) { toast.error("Tidak memiliki izin."); return; }

    setIsSubmitting(true);
    try {
      let profilePictureUrl: string | undefined;
      if (profilePicture) {
        try {
          const [meta, content] = profilePicture.split(",");
          const mime = meta.match(/:(.*?);/)?.[1] ?? "image/jpeg";
          const binary = atob(content);
          const arr = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
          const form = new FormData();
          form.append("image", new Blob([arr], { type: mime }));
          const res = await api.post("/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
          profilePictureUrl = res.data.url;
        } catch {}
      }
      const payload = {
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        profilePicture: profilePictureUrl,
      };
      const res = await api.post("/users", payload);
      toast.success(res.data?.message ?? "Pengguna ditambahkan.");
      onSuccess?.(res.data?.user);
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Gagal menambahkan pengguna.");
    } finally { setIsSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] w-[90vw]">
        <div className="max-h-[calc(100vh-6rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontSize: "1.25rem" }}>Tambah Pengguna Baru</DialogTitle>
            <DialogDescription className="text-sm">Masukkan informasi pengguna baru</DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm">Foto Profil (Opsional)</Label>
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  {profilePicture ? <AvatarImage src={profilePicture} /> : <AvatarFallback><User className="w-8 h-8 text-muted-foreground" /></AvatarFallback>}
                </Avatar>
                <div>
                  <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={handleProfilePictureChange} />
                  {!profilePicture ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className={`gap-1.5 ${btnAnim}`}><Upload className="w-3.5 h-3.5" />Upload</Button>
                  ) : (
                    <Button type="button" variant="outline" size="sm" onClick={() => { setProfilePicture(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className={`gap-1.5 ${btnAnim}`}><X className="w-3.5 h-3.5" />Hapus</Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1.5"><Label className="text-sm">Nama Depan</Label><Input className="h-9" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-sm">Nama Tengah (Opsional)</Label><Input className="h-9" value={middleName} onChange={(e) => setMiddleName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-sm">Nama Belakang</Label><Input className="h-9" value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-sm">Email</Label><Input type="email" className="h-9" value={email} onChange={(e) => setEmail(e.target.value)} /></div>

            <div className="space-y-1.5">
              <Label className="text-sm">Password</Label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} className="h-9 pr-10" value={password} onChange={(e) => setPassword(e.target.value)} />
                <Button type="button" variant="ghost" size="icon" className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword((s) => !s)}>
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Pilih role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="officer">Officer</SelectItem>
                  {isSuperadmin && <SelectItem value="admin">Admin</SelectItem>}
                  {isSuperadmin && <SelectItem value="superadmin">Superadmin</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => { resetForm(); onOpenChange(false); }} className={btnAnim}>Batal</Button>
              <Button type="submit" disabled={isSubmitting} className={btnAnim}>{isSubmitting ? "Menyimpan..." : "Tambah Pengguna"}</Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
