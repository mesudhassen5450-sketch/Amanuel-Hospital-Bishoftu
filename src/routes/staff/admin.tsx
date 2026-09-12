import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useStaffAuth } from "@/lib/staff-auth";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { StaffGuard } from "@/components/staff/StaffGuard";
import * as StaffAPI from "@/lib/api/staff-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users,
  UserCheck,
  UserX,
  Plus,
  Search,
  Eye,
  Edit,
  Key,
  Power,
  Loader2,
  Shield,
  User,
  Calendar,
  RefreshCw,
  Stethoscope,
  FlaskConical,
  Pill,
  CreditCard,
  Building2,
  AlertTriangle,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AddStaffModal, MEDICAL_SPECIALTIES } from "@/components/admin/AddStaffModal";
import { normalizeStaffRole } from "@/lib/staff-roles";

export const Route = createFileRoute("/staff/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard & Staff Management — Dr. Amanuel Hospital" },
      { name: "description", content: "Executive administrative dashboard and staff user account control." },
    ],
  }),
  component: AdminDashboardPage,
});

type StaffAccount = {
  id: number | string;
  username: string;
  role: string;
  displayName: string | null;
  isActive: boolean;
  isOnline: boolean;
  lastSeen: string | null;
  createdAt: string;
  updatedAt: string;
  specialty?: string;
  experience?: string;
  bio?: string;
};

function AdminDashboardPage() {
  const { user } = useStaffAuth();
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [toggleStatusDialogOpen, setToggleStatusDialogOpen] = useState(false);
  const [addStaffModalOpen, setAddStaffModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Selected staff account
  const [selectedStaff, setSelectedStaff] = useState<StaffAccount | null>(null);

  // Form states
  const [editForm, setEditForm] = useState({
    username: "",
    displayName: "",
    role: "",
    isActive: true,
    specialty: "",
    customSpecialty: "",
    experienceYears: 5 as number,
    bio: "",
  });
  const [resetPasswordForm, setResetPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [formLoading, setFormLoading] = useState(false);

  // Fetch staff accounts
  const fetchStaffAccounts = async () => {
    // Only fetch if user is authenticated and has a role
    if (!user?.role) {
      console.error("User not authenticated or missing role");
      return;
    }

    try {
      setLoading(true);
      const accounts = await StaffAPI.getAllStaffAccounts();
      // Ensure we always set an array, fallback to empty array if undefined
      setStaffAccounts(Array.isArray(accounts) ? accounts : []);
      setErrorState(null);
    } catch (error: any) {
      const msg = error?.message || "Failed to load staff accounts.";
      console.error("Fetch staff accounts error:", msg);
      setErrorState(msg);
      setStaffAccounts([]); // Set empty array on error
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role) {
      fetchStaffAccounts();
    }
  }, [user]);

  // Stats calculations with safe navigation
  const totalStaff = staffAccounts?.length ?? 0;
  const activeStaff = staffAccounts?.filter((s) => s.isActive).length ?? 0;
  const inactiveStaff = staffAccounts?.filter((s) => !s.isActive).length ?? 0;
  const receptionCount = staffAccounts?.filter((s) => normalizeStaffRole(s.role) === "reception").length ?? 0;
  const cashierCount = staffAccounts?.filter((s) => normalizeStaffRole(s.role) === "cashier").length ?? 0;
  const doctorCount = staffAccounts?.filter((s) => normalizeStaffRole(s.role) === "doctor").length ?? 0;
  const labCount = staffAccounts?.filter((s) => normalizeStaffRole(s.role) === "laboratory").length ?? 0;
  const pharmacyCount = staffAccounts?.filter((s) => normalizeStaffRole(s.role) === "pharmacy").length ?? 0;

  // Filter staff accounts with safe navigation
  const filteredStaff = (staffAccounts || []).filter((staff) => {
    const matchesSearch =
      staff.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.role?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || normalizeStaffRole(staff.role) === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Action Handlers
  const handleView = (staff: StaffAccount) => {
    setSelectedStaff(staff);
    setViewDialogOpen(true);
  };

  const handleEdit = (staff: StaffAccount) => {
    setSelectedStaff(staff);
    
    // Check if specialty is not in the predefined list (meaning it's custom)
    const isCustomSpecialty = staff.specialty && !MEDICAL_SPECIALTIES.includes(staff.specialty as any);
    
    setEditForm({
      username: staff.username,
      displayName: staff.displayName || "",
      role: staff.role,
      isActive: staff.isActive,
      specialty: isCustomSpecialty ? "Other" : (staff.specialty || "General Practice"),
      customSpecialty: isCustomSpecialty ? staff.specialty || "" : "",
      experienceYears: staff.experienceYears != null ? staff.experienceYears : 5,
      bio: staff.bio || "",
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedStaff) return;
    try {
      setFormLoading(true);
      
      // Use custom specialty if "Other" is selected
      const finalSpecialty = editForm.specialty === "Other" 
        ? editForm.customSpecialty.trim() || "General Practice"
        : editForm.specialty;
      
      await StaffAPI.updateStaffAccount(selectedStaff.id, {
        username: editForm.username,
        role: editForm.role,
        displayName: editForm.displayName,
        isActive: editForm.isActive,
        specialty: editForm.role.toLowerCase() === 'doctor' ? finalSpecialty : undefined,
        experienceYears: editForm.role.toLowerCase() === 'doctor' ? editForm.experienceYears : undefined,
        bio: editForm.role.toLowerCase() === 'doctor' ? editForm.bio : undefined,
      });
      toast.success("Staff account updated successfully");
      setEditDialogOpen(false);
      fetchStaffAccounts();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update staff account");
    } finally {
      setFormLoading(false);
    }
  };

  const handleResetPassword = (staff: StaffAccount) => {
    setSelectedStaff(staff);
    setResetPasswordForm({ newPassword: "", confirmPassword: "" });
    setResetPasswordDialogOpen(true);
  };

  const handleSavePasswordReset = async () => {
    if (!selectedStaff) return;

    if (resetPasswordForm.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setFormLoading(true);
      await StaffAPI.resetStaffPassword(selectedStaff.id, {
        newPassword: resetPasswordForm.newPassword,
        username: selectedStaff.username,
      });
      toast.success("Password reset successfully");
      setResetPasswordForm({ newPassword: "", confirmPassword: "" });
      setResetPasswordDialogOpen(false);
    } catch (error: any) {
      const msg = error?.message || "Failed to reset password";
      if (/token|unauthorized|access denied/i.test(msg)) {
        toast.error("Please log out, sign in as admin again, then reset the password.");
      } else {
        toast.error(msg);
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = (staff: StaffAccount) => {
    setSelectedStaff(staff);
    setToggleStatusDialogOpen(true);
  };

  const handleConfirmToggleStatus = async () => {
    if (!selectedStaff) return;

    try {
      setFormLoading(true);
      await StaffAPI.toggleStaffStatus(selectedStaff.id);
      toast.success(
        `Staff account ${selectedStaff.isActive ? "deactivated" : "activated"} successfully`
      );
      setToggleStatusDialogOpen(false);
      fetchStaffAccounts();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update staff status");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = (staff: StaffAccount) => {
    setSelectedStaff(staff);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedStaff) return;

    try {
      setFormLoading(true);
      const targetId = selectedStaff.id;
      const targetUsername = selectedStaff.username;
      
      await StaffAPI.deleteStaffAccount(targetId, targetUsername);

      setStaffAccounts((prev) =>
        prev.filter(
          (s) => String(s.id) !== String(targetId) && s.username?.toLowerCase() !== targetUsername?.toLowerCase()
        )
      );

      toast.success("Staff account deleted from the database");
      setDeleteDialogOpen(false);
      await fetchStaffAccounts();
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete staff account");
      await fetchStaffAccounts();
    } finally {
      setFormLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (normalizeStaffRole(role) || role?.toLowerCase()) {
      case "admin":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "doctor":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "reception":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "pharmacy":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "laboratory":
        return "bg-cyan-500/10 text-cyan-600 border-cyan-500/20";
      case "cashier":
        return "bg-indigo-500/10 text-indigo-600 border-indigo-500/20";
      default:
        return "bg-slate-500/10 text-slate-600 border-slate-500/20";
    }
  };

  return (
    <StaffGuard allowedRoles={["admin"]}>
      <StaffLayout>
        <div className="space-y-8 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border/60">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground font-display flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                Admin Dashboard
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Hospital staff oversight, account creation, and role management
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={fetchStaffAccounts}
                disabled={loading}
                className="gap-2 rounded-xl"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                Refresh
              </Button>
              <Button
                onClick={() => setAddStaffModalOpen(true)}
                className="gap-2 rounded-xl shadow-md"
              >
                <Plus className="h-4 w-4" />
                Add Staff Account
              </Button>
            </div>
          </div>

          {/* Stats Overview Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-border/60 bg-card shadow-sm rounded-2xl">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Staff</p>
                  <p className="text-3xl font-extrabold font-display text-foreground mt-1">{totalStaff}</p>
                </div>
                <div className="bg-primary/10 p-3 rounded-xl text-primary">
                  <Users className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card shadow-sm rounded-2xl">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Accounts</p>
                  <p className="text-3xl font-extrabold font-display text-emerald-600 mt-1">{activeStaff}</p>
                </div>
                <div className="bg-emerald-500/10 p-3 rounded-xl text-emerald-600">
                  <UserCheck className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card shadow-sm rounded-2xl">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inactive Staff</p>
                  <p className="text-3xl font-extrabold font-display text-destructive mt-1">{inactiveStaff}</p>
                </div>
                <div className="bg-destructive/10 p-3 rounded-xl text-destructive">
                  <UserX className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card shadow-sm rounded-2xl">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Doctors</p>
                  <p className="text-3xl font-extrabold font-display text-blue-600 mt-1">{doctorCount}</p>
                </div>
                <div className="bg-blue-500/10 p-3 rounded-xl text-blue-600">
                  <Stethoscope className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-card border border-border/60 rounded-2xl p-4 flex items-center gap-3">
              <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-600">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Reception</p>
                <p className="text-xl font-bold font-display">{receptionCount}</p>
              </div>
            </div>

            <div className="bg-card border border-border/60 rounded-2xl p-4 flex items-center gap-3">
              <div className="bg-indigo-500/10 p-2.5 rounded-xl text-indigo-600">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Cashiers</p>
                <p className="text-xl font-bold font-display">{cashierCount}</p>
              </div>
            </div>

            <div className="bg-card border border-border/60 rounded-2xl p-4 flex items-center gap-3">
              <div className="bg-cyan-500/10 p-2.5 rounded-xl text-cyan-600">
                <FlaskConical className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Laboratory</p>
                <p className="text-xl font-bold font-display">{labCount}</p>
              </div>
            </div>

            <div className="bg-card border border-border/60 rounded-2xl p-4 flex items-center gap-3">
              <div className="bg-amber-500/10 p-2.5 rounded-xl text-amber-600">
                <Pill className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Pharmacy</p>
                <p className="text-xl font-bold font-display">{pharmacyCount}</p>
              </div>
            </div>
          </div>

          {/* Error Notice */}
          {errorState && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl p-4 flex items-center gap-3 text-sm">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">Database Error</p>
                <p className="text-xs text-destructive/80 mt-0.5">{errorState}</p>
              </div>
              <Button size="sm" variant="outline" onClick={fetchStaffAccounts} className="rounded-xl text-xs">
                Retry
              </Button>
            </div>
          )}

          {/* Search & Filter Bar */}
          <Card className="border border-border/60 bg-card shadow-sm rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by username, full name, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl border-input/60"
                />
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="role-filter" className="text-xs text-muted-foreground whitespace-nowrap">Filter Role:</Label>
                <select
                  id="role-filter"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-input/60 bg-background text-xs font-semibold outline-none cursor-pointer"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="reception">Reception</option>
                  <option value="cashier">Cashier</option>
                  <option value="doctor">Doctor</option>
                  <option value="laboratory">Laboratory</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Staff Accounts Table */}
          <Card className="border border-border/60 bg-card shadow-md rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/60 bg-muted/20 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold font-display">Hospital Staff Accounts</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Manage credentials, roles, and status for all hospital staff
                  </CardDescription>
                </div>
                <Badge variant="outline" className="rounded-full px-3 py-1 font-mono text-xs">
                  {filteredStaff?.length ?? 0} Accounts
                </Badge>
              </div>
            </CardHeader>

            {/* ── DESKTOP TABLE (md and above) ─────────────────────────── */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">Full Name</TableHead>
                    <TableHead className="font-semibold">Username</TableHead>
                    <TableHead className="font-semibold">Role</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Online</TableHead>
                    <TableHead className="font-semibold">Created Date</TableHead>
                    <TableHead className="font-semibold">Last Seen</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <span className="text-sm">Loading staff account data...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredStaff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        {searchQuery || roleFilter !== "all"
                          ? "No staff accounts matched your filters."
                          : "No staff accounts found in the database."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStaff.map((staff) => (
                      <TableRow key={staff.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="font-semibold text-foreground">
                          {staff.displayName || "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {staff.username}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("border font-semibold text-xs capitalize", getRoleBadgeColor(staff.role))}>
                            {staff.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              "border text-xs font-semibold rounded-full px-2.5 py-0.5",
                              staff.isActive
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-destructive/10 text-destructive border-destructive/20"
                            )}
                          >
                            {staff.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {staff.role?.toLowerCase() === "doctor" ? (
                            <Badge
                              className={cn(
                                "border text-xs font-semibold rounded-full px-2.5 py-0.5",
                                staff.isOnline
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : "bg-slate-500/10 text-slate-600 border-slate-500/20"
                              )}
                            >
                              {staff.isOnline ? (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
                                  Online
                                </>
                              ) : (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-slate-400 mr-1.5" />
                                  Offline
                                </>
                              )}
                            </Badge>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {formatDate(staff.createdAt)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {formatDate(staff.lastSeen)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleView(staff)}
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(staff)}
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary"
                              title="Edit Staff Account"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleResetPassword(staff)}
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-amber-600"
                              title="Reset Password"
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(staff)}
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive"
                              title="Delete Staff Account"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleStatus(staff)}
                              className={cn(
                                "h-8 w-8 rounded-lg",
                                staff.isActive
                                  ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  : "text-emerald-600 hover:bg-emerald-500/10"
                              )}
                              title={staff.isActive ? "Deactivate Account" : "Activate Account"}
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* ── MOBILE CARD LIST (below md) ───────────────────────────── */}
            <div className="md:hidden divide-y divide-border/60">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm">Loading staff account data...</span>
                </div>
              ) : filteredStaff.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground px-6">
                  {searchQuery || roleFilter !== "all"
                    ? "No staff accounts matched your filters."
                    : "No staff accounts found in the database."}
                </div>
              ) : (
                filteredStaff.map((staff) => (
                  <div key={staff.id} className="px-4 py-3.5 space-y-2.5">
                    {/* Top row: name + status badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {staff.displayName || "—"}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground truncate mt-0.5">
                          @{staff.username}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        <Badge className={cn("border font-semibold text-xs capitalize", getRoleBadgeColor(staff.role))}>
                          {staff.role}
                        </Badge>
                        <Badge
                          className={cn(
                            "border text-xs font-semibold rounded-full px-2 py-0.5",
                            staff.isActive
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : "bg-destructive/10 text-destructive border-destructive/20"
                          )}
                        >
                          {staff.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {staff.role?.toLowerCase() === "doctor" && (
                          <Badge
                            className={cn(
                              "border text-xs font-semibold rounded-full px-2 py-0.5",
                              staff.isOnline
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                            )}
                          >
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full mr-1 inline-block",
                              staff.isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                            )} />
                            {staff.isOnline ? "Online" : "Offline"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Meta row: dates */}
                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(staff.createdAt)}
                      </span>
                      {staff.lastSeen && (
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {formatDate(staff.lastSeen)}
                        </span>
                      )}
                    </div>

                    {/* Action buttons — full-width row, easy to tap */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {/* View */}
                      <button
                        onClick={() => handleView(staff)}
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => handleEdit(staff)}
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                        title="Edit Staff Account"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Edit
                      </button>

                      {/* Reset Password */}
                      <button
                        onClick={() => handleResetPassword(staff)}
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                        title="Reset Password"
                      >
                        <Key className="h-3.5 w-3.5" />
                        Reset
                      </button>

                      {/* Enable / Disable — only this button carries semantic colour as a status signal */}
                      <button
                        onClick={() => handleToggleStatus(staff)}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border text-xs font-medium transition-colors",
                          staff.isActive
                            ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                            : "border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        )}
                        title={staff.isActive ? "Deactivate Account" : "Activate Account"}
                      >
                        <Power className="h-3.5 w-3.5" />
                        {staff.isActive ? "Disable" : "Enable"}
                      </button>

                      {/* Delete — icon only, slim destructive border, no fill */}
                      <button
                        onClick={() => handleDelete(staff)}
                        className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 hover:border-red-300 dark:hover:border-red-800 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        title="Delete Staff Account"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* View Modal */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display">
                <User className="h-5 w-5 text-primary" />
                Staff Account Details
              </DialogTitle>
            </DialogHeader>
            {selectedStaff && (
              <div className="space-y-4 py-3">
                <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl">
                  <div>
                    <Label className="text-xs text-muted-foreground">Full Name</Label>
                    <p className="font-semibold text-sm mt-0.5">{selectedStaff.displayName || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Username</Label>
                    <p className="font-mono text-sm mt-0.5">{selectedStaff.username}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Role</Label>
                    <div className="mt-1">
                      <Badge className={cn("border font-semibold text-xs capitalize", getRoleBadgeColor(selectedStaff.role))}>
                        {selectedStaff.role}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Account Status</Label>
                    <div className="mt-1">
                      <Badge
                        className={cn(
                          "border text-xs font-semibold rounded-full px-2.5 py-0.5",
                          selectedStaff.isActive
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                        )}
                      >
                        {selectedStaff.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-border/60 pt-3">
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Created
                    </Label>
                    <p className="text-xs font-medium mt-1">{formatDate(selectedStaff.createdAt)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Last Seen
                    </Label>
                    <p className="text-xs font-medium mt-1">{formatDate(selectedStaff.lastSeen)}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl flex flex-col max-h-[90vh] p-0 gap-0">
            {/* Fixed header */}
            <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
              <DialogTitle className="flex items-center gap-2 font-display">
                <Edit className="h-5 w-5 text-primary" />
                Edit Staff Account
              </DialogTitle>
              <DialogDescription className="text-xs">
                Update account parameters for {selectedStaff?.displayName || selectedStaff?.username}
              </DialogDescription>
            </DialogHeader>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-username" className="text-xs font-semibold">Username</Label>
                <Input
                  id="edit-username"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value.toLowerCase() })}
                  placeholder="Enter username (lowercase)"
                  className="rounded-xl font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Username must be at least 3 characters and will be stored in lowercase.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-displayName" className="text-xs font-semibold">Full Name</Label>
                <Input
                  id="edit-displayName"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  placeholder="Enter staff full name"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-role" className="text-xs font-semibold">System Role</Label>
                <select
                  id="edit-role"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs font-semibold outline-none"
                >
                  <option value="admin">Admin</option>
                  <option value="reception">Reception</option>
                  <option value="cashier">Cashier</option>
                  <option value="doctor">Doctor</option>
                  <option value="laboratory">Laboratory</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="staff">Staff</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="edit-isActive"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <Label htmlFor="edit-isActive" className="text-xs cursor-pointer font-medium">
                  Active Account (Allowed to sign in)
                </Label>
              </div>

              {/* Doctor-specific fields */}
              {editForm.role.toLowerCase() === 'doctor' && (
                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-xl space-y-3 mt-2">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    Doctor Profile (Shown on Public Doctor Page)
                  </p>

                  {/* Specialty dropdown */}
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-specialty" className="text-xs font-semibold">Medical Specialty</Label>
                    <select
                      id="edit-specialty"
                      value={editForm.specialty}
                      onChange={(e) => setEditForm({ ...editForm, specialty: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs font-medium outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {MEDICAL_SPECIALTIES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Custom Specialty Input (shown when "Other" is selected) */}
                  {editForm.specialty === "Other" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-customSpecialty" className="text-xs font-semibold">Custom Specialty *</Label>
                      <input
                        id="edit-customSpecialty"
                        value={editForm.customSpecialty}
                        onChange={(e) => setEditForm({ ...editForm, customSpecialty: e.target.value })}
                        placeholder="Enter custom specialty (e.g. Emergency Medicine)"
                        className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  )}

                  {/* Experience years dropdown */}
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-experienceYears" className="text-xs font-semibold">Years of Experience</Label>
                    <select
                      id="edit-experienceYears"
                      value={editForm.experienceYears}
                      onChange={(e) =>
                        setEditForm({ ...editForm, experienceYears: Number(e.target.value) })
                      }
                      className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs font-medium outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {Array.from({ length: 29 }, (_, i) => i + 1).map((yr) => (
                        <option key={yr} value={yr}>
                          {yr} {yr === 1 ? "year" : "years"}
                        </option>
                      ))}
                      <option value={30}>30+ years</option>
                    </select>
                  </div>

                  {/* Bio — extra bottom padding so it clears the footer */}
                  <div className="space-y-1.5 pb-2">
                    <Label htmlFor="edit-bio" className="text-xs font-semibold">Bio / Summary</Label>
                    <input
                      id="edit-bio"
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      placeholder="Brief description of expertise..."
                      className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Fixed footer — always visible */}
            <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={formLoading} className="rounded-xl text-xs font-semibold">
                {formLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Password Modal */}
        <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display">
                <Key className="h-5 w-5 text-primary" />
                Reset Password
              </DialogTitle>
              <DialogDescription className="text-xs">
                Enter a new password for {selectedStaff?.displayName || selectedStaff?.username}.
                {selectedStaff?.username ? (
                  <>
                    {" "}Login username: <span className="font-mono font-semibold">{selectedStaff.username}</span>
                  </>
                ) : null}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-password" className="text-xs font-semibold">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={resetPasswordForm.newPassword}
                  onChange={(e) =>
                    setResetPasswordForm({ ...resetPasswordForm, newPassword: e.target.value })
                  }
                  placeholder="At least 6 characters"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" className="text-xs font-semibold">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={resetPasswordForm.confirmPassword}
                  onChange={(e) =>
                    setResetPasswordForm({ ...resetPasswordForm, confirmPassword: e.target.value })
                  }
                  placeholder="Re-enter new password"
                  className="rounded-xl"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setResetPasswordDialogOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button onClick={handleSavePasswordReset} disabled={formLoading} className="rounded-xl text-xs font-semibold">
                {formLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Toggle Status Modal */}
        <AlertDialog open={toggleStatusDialogOpen} onOpenChange={setToggleStatusDialogOpen}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 font-display">
                <Power className="h-5 w-5 text-primary" />
                {selectedStaff?.isActive ? "Deactivate" : "Activate"} Staff Account
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground mt-2">
                Are you sure you want to {selectedStaff?.isActive ? "deactivate" : "activate"} the account for{" "}
                <span className="font-semibold text-foreground">{selectedStaff?.displayName || selectedStaff?.username}</span>?
                {selectedStaff?.isActive &&
                  " Inactive users are immediately blocked from logging into the portal."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="pt-3">
              <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmToggleStatus}
                disabled={formLoading}
                className={cn(
                  "rounded-xl text-xs font-semibold",
                  selectedStaff?.isActive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-emerald-600 text-white hover:bg-emerald-700"
                )}
              >
                {formLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...
                  </>
                ) : selectedStaff?.isActive ? (
                  "Deactivate Account"
                ) : (
                  "Activate Account"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 font-display">
                <Trash2 className="h-5 w-5 text-destructive" />
                Delete Staff Account
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground mt-2">
                Are you sure you want to permanently delete{" "}
                <span className="font-semibold text-foreground">{selectedStaff?.displayName || selectedStaff?.username}</span>
                {selectedStaff?.username ? (
                  <>
                    {" "}(<span className="font-mono">{selectedStaff.username}</span>)
                  </>
                ) : null}
                ? This removes the account from the database for reception, cashier, laboratory, pharmacy, staff, and doctors. Deleted doctors also disappear from the public doctors page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="pt-3">
              <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={formLoading}
                className="rounded-xl text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {formLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting...
                  </>
                ) : (
                  "Delete Account"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add Staff Modal */}
        <AddStaffModal
          isOpen={addStaffModalOpen}
          onClose={() => setAddStaffModalOpen(false)}
          onSuccess={fetchStaffAccounts}
        />
      </StaffLayout>
    </StaffGuard>
  );
}
