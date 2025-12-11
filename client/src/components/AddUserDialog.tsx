import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Upload, User, X, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddUserDialog({ open, onOpenChange }: AddUserDialogProps) {
  const { user: authUser } = useAuth(); // current user for role checks
  const isSuperadmin = String(authUser?.role || "").toUpperCase().trim() === "SUPERADMIN";
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran file terlalu besar. Maksimal 5MB.');
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error('File harus berupa gambar.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveProfilePicture = () => {
    setProfilePicture(null);
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Convert data URL to Blob
  const dataUrlToBlob = (dataUrl: string) => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  // Upload to Cloudinary
  const uploadToBackend = async (dataUrl: string): Promise<string> => {
    const blob = dataUrlToBlob(dataUrl);
    const form = new FormData();
    form.append("image", blob);

    const res = await api.post("/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!firstName.trim()) return toast.error('Nama depan wajib diisi.');
    if (!lastName.trim()) return toast.error('Nama belakang wajib diisi.');
    if (!email.trim()) return toast.error('Email wajib diisi.');
    if (!email.includes('@')) return toast.error('Email tidak valid.');
    if (!password) return toast.error('Password wajib diisi.');
    if (password.length < 8) return toast.error('Password minimal 8 karakter.');
    if (!role) return toast.error('Role wajib dipilih.');

    // Client-side authorization guard: prevent non-superadmin from creating elevated accounts
    if (!isSuperadmin && (role === 'admin' || role === 'superadmin')) {
      return toast.error('Anda tidak memiliki izin untuk membuat akun Admin atau Superadmin.');
    }

    setIsSubmitting(true);

    try {
      // ---- Upload to Cloudinary if picture exists ----
      let profilePictureUrl: string | undefined = undefined;
      if (profilePicture) {
        try {
          profilePictureUrl = await uploadToBackend(profilePicture);
        } catch (err) {
          console.warn('Cloudinary upload failed, fallback to base64.', err);
          profilePictureUrl = undefined;
        }
      }

      // ---- Construct request body ----
      const body = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        profilePicture: profilePictureUrl ?? profilePicture ?? undefined,
      };

      // ---- Send to backend ----
      // If creating Admin/Superadmin, call an admin-only endpoint so the backend can enforce strict server-side checks.
      // NOTE: The backend MUST validate the authenticated user's role and refuse creation if not SUPERADMIN.
      const creatingElevated = role === 'admin' || role === 'superadmin';
      const endpoint = creatingElevated ? '/admin/users' : '/users/register';
      const res = await api.post(endpoint, body);
      toast.success(res.data?.message || `Pengguna ${firstName} ${lastName} berhasil ditambahkan!`);

      // ---- Reset form ----
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setShowPassword(false);
      setRole('');
      setProfilePicture(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      onOpenChange(false);
    } catch (err: any) {
      console.error('Error creating user:', err);
      toast.error(err?.response?.data?.message || 'Terjadi kesalahan saat menambahkan pengguna.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Reset form
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setRole('');
    setProfilePicture(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Close dialog
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] w-[90vw]">
        {/* Constrain the inner content height relative to the viewport and allow internal scrolling.
            calc(100vh - X) reserves space for the dialog's margins, header/footer and keeps the modal
            from using the full screen height. Adjust the X values as needed. */}
        <div className="max-h-[calc(100vh-6rem)] sm:max-h-[calc(100vh-8rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Tambah Pengguna Baru</DialogTitle>
            <DialogDescription className="text-lg">
              Masukkan informasi pengguna baru untuk sistem Elder Care
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            {/* Profile Picture Upload */}
            <div className="space-y-3">
              <Label>Foto Profil (Opsional)</Label>
              <div className="flex items-center gap-6">
                <Avatar className="w-24 h-24 shadow-md border-2 border-muted">
                  {profilePicture ? (
                    <AvatarImage src={profilePicture} alt="Profile preview" />
                  ) : (
                    <AvatarFallback className="bg-muted">
                      <User className="w-12 h-12 text-muted-foreground" />
                    </AvatarFallback>
                  )}
                </Avatar>
                
                <div className="flex-1 space-y-3">
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="profile-picture"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      className="hidden"
                    />
                    {!profilePicture ? (
                      <label htmlFor="profile-picture">
                        <Button
                          type="button"
                          variant="outline"
                          size="lg"
                          className="cursor-pointer"
                          onClick={() => document.getElementById('profile-picture')?.click()}
                        >
                          <Upload className="w-5 h-5 mr-2" />
                          Upload Foto
                        </Button>
                      </label>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        onClick={handleRemoveProfilePicture}
                      >
                        <X className="w-5 h-5 mr-2" />
                        Hapus Foto
                      </Button>
                    )}
                    <p className="text-sm text-muted-foreground mt-2">
                      JPG, PNG atau GIF. Maksimal 5MB.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="firstName">Nama Depan *</Label>
              <Input
                id="firstName"
                placeholder="Masukkan nama depan"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-12 shadow-sm"
                required
              />
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="lastName">Nama Belakang *</Label>
              <Input
                id="lastName"
                placeholder="Masukkan nama belakang"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-12 shadow-sm"
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@eldercare.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 shadow-sm"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimal 8 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 shadow-sm pr-12"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Eye className="h-5 w-5 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select value={role} onValueChange={setRole} required>
                <SelectTrigger id="role" className="h-12 shadow-sm">
                  <SelectValue placeholder="Pilih role pengguna" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="officer">Officer</SelectItem>
                  {/* Only allow creation of Admin/Superadmin when current user is SUPERADMIN */}
                  {isSuperadmin && <SelectItem value="admin">Admin</SelectItem>}
                  {isSuperadmin && <SelectItem value="superadmin">Superadmin</SelectItem>}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {role === 'officer' && 'Officer dapat mengelola data pasien dan upload file.'}
                {role === 'admin' && isSuperadmin && 'Admin dapat mengelola pengguna dan melihat statistik sistem.'}
                {role === 'superadmin' && isSuperadmin && 'Superadmin memiliki akses penuh ke seluruh sistem.'}
                {!isSuperadmin && (role === 'admin' || role === 'superadmin') && (
                  <span className="text-destructive">Anda tidak memiliki izin untuk memilih role ini.</span>
                )}
                {!isSuperadmin && <div className="mt-1 text-xs text-muted-foreground">Hanya Superadmin yang dapat membuat akun Admin atau Superadmin.</div>}
              </p>
            </div>

            <DialogFooter className="gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="h-12 px-6"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="h-12 px-6"
              >
                {isSubmitting ? 'Menyimpan...' : 'Tambah Pengguna'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
