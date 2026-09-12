import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import * as StaffAPI from "@/lib/api/staff-api";

/** Shared list used by both Add and Edit forms */
export const MEDICAL_SPECIALTIES = [
  "Cardiology",
  "Pediatrics",
  "Internal Medicine",
  "General Practice",
  "Dermatology",
  "Gynecology",
  "Orthopedics",
  "Neurology",
  "Ophthalmology",
  "Radiology",
  "Other",
] as const;

/** Options for the experience_years dropdown (1–29 + 30+) */
const EXPERIENCE_YEAR_OPTIONS: Array<{ label: string; value: number }> = [
  ...Array.from({ length: 29 }, (_, i) => ({ label: `${i + 1} year${i === 0 ? "" : "s"}`, value: i + 1 })),
  { label: "30+ years", value: 30 },
];

const SELECT_CLASS =
  "w-full h-10 px-3 rounded-xl border border-input bg-background text-xs font-medium outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed";

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Created account so Admin can show it immediately */
  onSuccess: (account?: StaffAPI.StaffAccount) => void;
}

const EMPTY_FORM = {
  displayName: "",
  username: "",
  password: "",
  confirmPassword: "",
  role: "doctor",
  isActive: true,
  specialty: "General Practice" as string,
  customSpecialty: "" as string,
  experienceYears: 5 as number,
  bio: "",
};

export function AddStaffModal({ isOpen, onClose, onSuccess }: AddStaffModalProps) {
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.displayName.trim()) { toast.error("Full name is required"); return; }
    if (!formData.username.trim()) { toast.error("Username is required"); return; }
    if (formData.username.length < 3) { toast.error("Username must be at least 3 characters"); return; }
    if (!formData.password) { toast.error("Password is required"); return; }
    if (formData.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (formData.password !== formData.confirmPassword) { toast.error("Passwords do not match"); return; }

    try {
      setLoading(true);
      const isDoctor = formData.role === "doctor";
      
      // Use custom specialty if "Other" is selected
      const finalSpecialty = formData.specialty === "Other" 
        ? formData.customSpecialty.trim() || "General Practice"
        : formData.specialty;
      
      const created = await StaffAPI.createStaffAccount({
        username: formData.username.trim(),
        password: formData.password,
        role: formData.role,
        displayName: formData.displayName.trim(),
        isActive: formData.isActive,
        specialty: isDoctor ? finalSpecialty : undefined,
        experienceYears: isDoctor ? formData.experienceYears : undefined,
        bio: isDoctor ? formData.bio : undefined,
      });
      toast.success(
        isDoctor
          ? "Doctor account created — login + public profile saved"
          : "Staff account created successfully"
      );
      setFormData({ ...EMPTY_FORM });
      onSuccess(created);
      onClose();
    } catch (error: any) {
      toast.error(error?.message || "Failed to create staff account");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({ ...EMPTY_FORM });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <UserPlus className="h-5 w-5 text-primary" />
            Create Staff / Doctor Account
          </DialogTitle>
          <DialogDescription className="text-xs">
            Add a new staff member or doctor to the hospital system
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="displayName" className="text-xs font-semibold">Full Name *</Label>
            <Input
              id="displayName"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="Enter full name (e.g. Dr. Samuel Bekele)"
              className="rounded-xl"
              disabled={loading}
            />
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-xs font-semibold">Username *</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
              placeholder="Enter username (lowercase, e.g. drsamuel)"
              className="rounded-xl font-mono text-sm"
              disabled={loading}
            />
            <p className="text-[11px] text-muted-foreground">
              Username must be at least 3 characters and will be stored in lowercase.
            </p>
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label htmlFor="role" className="text-xs font-semibold">Role *</Label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className={SELECT_CLASS}
              disabled={loading}
            >
              <option value="doctor">Doctor</option>
              <option value="staff">Staff</option>
              <option value="reception">Reception</option>
              <option value="cashier">Cashier</option>
              <option value="laboratory">Laboratory</option>
              <option value="pharmacy">Pharmacy</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Doctor-specific fields */}
          {formData.role === "doctor" && (
            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-xl space-y-3">
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
                Doctor Profile Info (Displayed on Public Doctor Page)
              </p>

              {/* Specialty dropdown */}
              <div className="space-y-1">
                <Label htmlFor="specialty" className="text-xs font-semibold">Medical Specialty</Label>
                <select
                  id="specialty"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  className={SELECT_CLASS}
                  disabled={loading}
                >
                  {MEDICAL_SPECIALTIES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Custom Specialty Input (shown when "Other" is selected) */}
              {formData.specialty === "Other" && (
                <div className="space-y-1">
                  <Label htmlFor="customSpecialty" className="text-xs font-semibold">Custom Specialty *</Label>
                  <Input
                    id="customSpecialty"
                    value={formData.customSpecialty}
                    onChange={(e) => setFormData({ ...formData, customSpecialty: e.target.value })}
                    placeholder="Enter custom specialty (e.g. Emergency Medicine)"
                    className="rounded-xl bg-white dark:bg-slate-900"
                    disabled={loading}
                  />
                </div>
              )}

              {/* Experience years dropdown */}
              <div className="space-y-1">
                <Label htmlFor="experienceYears" className="text-xs font-semibold">
                  Years of Experience
                </Label>
                <select
                  id="experienceYears"
                  value={formData.experienceYears}
                  onChange={(e) =>
                    setFormData({ ...formData, experienceYears: Number(e.target.value) })
                  }
                  className={SELECT_CLASS}
                  disabled={loading}
                >
                  {EXPERIENCE_YEAR_OPTIONS.map(({ label, value }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Bio */}
              <div className="space-y-1">
                <Label htmlFor="bio" className="text-xs font-semibold">Bio / Summary</Label>
                <Input
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Brief summary of expertise..."
                  className="rounded-xl bg-white dark:bg-slate-900"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold">Password *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter password (min 6 characters)"
              className="rounded-xl"
              disabled={loading}
            />
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-xs font-semibold">Confirm Password *</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="Re-enter password"
              className="rounded-xl"
              disabled={loading}
            />
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
              disabled={loading}
            />
            <Label htmlFor="isActive" className="text-xs cursor-pointer font-medium">
              Active Account (Allowed to sign in)
            </Label>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="rounded-xl text-xs" disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl text-xs font-semibold" disabled={loading}>
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
              ) : (
                "Create Account"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
