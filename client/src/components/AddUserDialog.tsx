import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Upload, User, X, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddUserDialog({ open, onOpenChange }: AddUserDialogProps) {
  const { user: authUser } = useAuth();

  const isSuperadmin =
    String(authUser?.role || "").toUpperCase().trim() === "SUPERADMIN";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("");
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ------------------------------------------------------------------ */
  /* Helpers                                                            */
  /* ------------------------------------------------------------------ */

  const resetForm = (): void => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setRole("");
    setShowPassword(false);
    setProfilePicture(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const dataUrlToBlob = (dataUrl: string): Blob => {
    const [meta, content] = dataUrl.split(",");
    const mime = meta.match(/:(.*?);/)?.[1] ?? "image/jpeg";
    const binary = atob(content);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return new Blob([arr], { type: mime });
  };

  const uploadToBackend = async (dataUrl: string): Promise<string> => {
    const blob = dataUrlToBlob(dataUrl);
    const form = new FormData();
    form.append("image", blob);

    const res = await api.post("/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data.url;
  };

  /* ------------------------------------------------------------------ */
  /* Event Handlers (VOID SAFE)                                         */
  /* ------------------------------------------------------------------ */

  const handleProfilePictureChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5MB.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePicture(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveProfilePicture = (): void => {
    setProfilePicture(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!firstName.trim()) { toast.error("Nama depan wajib diisi."); return; }
    if (!lastName.trim()) { toast.error("Nama belakang wajib diisi."); return; }
    if (!email.includes("@")) { toast.error("Email tidak valid."); return; }
    if (password.length < 8) { toast.error("Password minimal 8 karakter."); return; }
    if (!role) { toast.error("Role wajib dipilih."); return; }

    if (!isSuperadmin && (role === "admin" || role === "superadmin")) {
      toast.error("Anda tidak memiliki izin membuat akun ini.");
      return;
    }

    setIsSubmitting(true);

    try {
      let profilePictureUrl: string | undefined;

      if (profilePicture) {
        try {
          profilePictureUrl = await uploadToBackend(profilePicture);
        } catch {
          profilePictureUrl = undefined;
        }
      }

      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        profilePicture: profilePictureUrl ?? undefined,
      };

      const elevated = role === "admin" || role === "superadmin";
      const endpoint = elevated ? "/admin/users" : "/users/register";

      const res = await api.post(endpoint, payload);

      toast.success(res.data?.message ?? "Pengguna berhasil ditambahkan.");

      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Create user failed:", err);
      toast.error(
        err?.response?.data?.message ?? "Gagal menambahkan pengguna."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = (): void => {
    resetForm();
    onOpenChange(false);
  };

  /* ------------------------------------------------------------------ */
  /* Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] w-[90vw]">
        <div className="max-h-[calc(100vh-6rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Tambah Pengguna Baru
            </DialogTitle>
            <DialogDescription className="text-lg">
              Masukkan informasi pengguna baru ke sistem
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
            className="space-y-6 py-4"
          >
            {/* Avatar */}
            <div className="space-y-3">
              <Label>Foto Profil (Opsional)</Label>
              <div className="flex items-center gap-6">
                <Avatar className="w-24 h-24">
                  {profilePicture ? (
                    <AvatarImage src={profilePicture} />
                  ) : (
                    <AvatarFallback>
                      <User className="w-10 h-10 text-muted-foreground" />
                    </AvatarFallback>
                  )}
                </Avatar>

                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                  />

                  {!profilePicture ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        fileInputRef.current?.click();
                      }}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Foto
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRemoveProfilePicture}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Hapus Foto
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nama Depan</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Nama Belakang</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => {
                    setShowPassword((s) => !s);
                  }}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="officer">Officer</SelectItem>
                  {isSuperadmin && <SelectItem value="admin">Admin</SelectItem>}
                  {isSuperadmin && (
                    <SelectItem value="superadmin">Superadmin</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={handleCancel}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan…" : "Tambah Pengguna"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
