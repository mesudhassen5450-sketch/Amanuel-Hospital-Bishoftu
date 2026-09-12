import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { StaffGuard } from "@/components/staff/StaffGuard";
import * as StaffAPI from "@/lib/api/staff-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/staff/staff-accounts/create")({
  head: () => ({
    meta: [{ title: "Create Staff Account — Dr. Amanuel Hospital" }],
  }),
  component: CreateStaffAccountPage,
});

function CreateStaffAccountPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    username: "",
    password: "",
    confirmPassword: "",
    role: "staff",
    isActive: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.displayName.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (!formData.username.trim()) {
      toast.error("Username is required");
      return;
    }
    if (formData.username.length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }
    if (!formData.password) {
      toast.error("Password is required");
      return;
    }
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      await StaffAPI.createStaffAccount({
        username: formData.username.trim(),
        password: formData.password,
        role: formData.role,
        displayName: formData.displayName.trim(),
        isActive: formData.isActive,
      });
      toast.success("Staff account created successfully — you can log in with this username and password now");
      // Reset form
      setFormData({
        displayName: "",
        username: "",
        password: "",
        confirmPassword: "",
        role: "staff",
        isActive: true,
      });
    } catch (error: any) {
      toast.error(error?.message || "Failed to create staff account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <StaffGuard allowedRoles={["admin"]}>
      <StaffLayout>
        <div className="max-w-2xl mx-auto animate-fade-in">
          {/* Header */}
          <div className="mb-6">
            <Link to="/staff/admin">
              <Button variant="ghost" className="gap-2 mb-4">
                <ArrowLeft className="h-4 w-4" />
                Back to Admin Dashboard
              </Button>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground font-display flex items-center gap-3">
              <UserPlus className="h-8 w-8 text-primary" />
              Create Staff Account
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Add a new staff member to the hospital system
            </p>
          </div>

          {/* Form Card */}
          <Card className="border border-border/60 bg-card shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold font-display">Staff Account Details</CardTitle>
              <CardDescription className="text-xs">
                Enter the staff member's information below. All fields marked with * are required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="displayName" className="text-xs font-semibold">
                    Full Name *
                  </Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="Enter staff member's full name"
                    className="rounded-xl"
                    disabled={loading}
                  />
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-xs font-semibold">
                    Username *
                  </Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                    placeholder="Enter username (lowercase)"
                    className="rounded-xl font-mono text-sm"
                    disabled={loading}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Username must be at least 3 characters and will be stored in lowercase.
                  </p>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold">
                    Password *
                  </Label>
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
                  <Label htmlFor="confirmPassword" className="text-xs font-semibold">
                    Confirm Password *
                  </Label>
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

                {/* Role */}
                <div className="space-y-1.5">
                  <Label htmlFor="role" className="text-xs font-semibold">
                    Role *
                  </Label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs font-semibold outline-none"
                    disabled={loading}
                  >
                    <option value="staff">Staff</option>
                    <option value="reception">Reception</option>
                    <option value="cashier">Cashier</option>
                    <option value="doctor">Doctor</option>
                    <option value="laboratory">Laboratory</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="admin">Admin</option>
                  </select>
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

                {/* Submit Button */}
                <div className="pt-4 flex gap-3">
                  <Link to="/staff/admin" className="flex-1">
                    <Button type="button" variant="outline" className="w-full rounded-xl text-xs" disabled={loading}>
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" className="flex-1 rounded-xl text-xs font-semibold" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Staff Account"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </StaffLayout>
    </StaffGuard>
  );
}
