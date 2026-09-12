import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { StaffGuard } from "@/components/staff/StaffGuard";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { useStaffAuth } from "@/lib/staff-auth";
import { registerPatient } from "@/lib/staff-server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { UserPlus, ChevronLeft, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/staff/patients/new")({
  head: () => ({ meta: [{ title: "Register Patient — Dr. Amanuel Hospital" }] }),
  component: NewPatientPage,
});

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="font-semibold text-sm text-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function NewPatientPage() {
  const navigate = useNavigate();
  const { user } = useStaffAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "", phone: "", date_of_birth: "", gender: "",
    address: "", emergency_contact_name: "", emergency_contact_phone: "",
    blood_group: "", allergies: "", chronic_conditions: "", notes: "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) { toast.error("Full name is required."); return; }
    if (!form.phone.trim())     { toast.error("Phone number is required."); return; }
    setLoading(true);
    try {
      const patient = await registerPatient({ data: {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        date_of_birth: form.date_of_birth || undefined,
        gender: form.gender || undefined,
        address: form.address || undefined,
        emergency_contact_name: form.emergency_contact_name || undefined,
        emergency_contact_phone: form.emergency_contact_phone || undefined,
        blood_group: form.blood_group || undefined,
        allergies: form.allergies || undefined,
        chronic_conditions: form.chronic_conditions || undefined,
        notes: form.notes || undefined,
        callerRole: user?.role ?? undefined,
      }});
      const linked = Number((patient as any).linkedAppointments || 0);
      toast.success(
        linked > 0
          ? `Patient registered! MRN: ${(patient as any).mrn}. Linked ${linked} appointment(s).`
          : `Patient registered! MRN: ${(patient as any).mrn}`
      );
      navigate({ to: "/staff/patients/$mrn", params: { mrn: (patient as any).mrn } });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? "Failed to register patient.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <StaffGuard allowedRoles={["reception", "staff"]}>
      <StaffLayout>
        {/* Page header */}
        <div className="mb-6 flex items-center gap-3">
          <Link to="/staff/patients" className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground font-display flex items-center gap-2">
              <UserPlus className="h-6 w-6 text-primary" /> Register New Patient
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Fill in the form — a unique MRN will be generated automatically.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
          {/* Personal Info */}
          <Card className="border border-border/60 rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-semibold">Personal Information</CardTitle>
              <CardDescription className="text-xs">Basic patient details</CardDescription>
            </CardHeader>
            <CardContent className="pt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Full Name" required>
                <Input value={form.full_name} onChange={e => set("full_name", e.target.value)}
                  placeholder="Full legal name" className="rounded-xl h-11" />
              </Field>
              <Field label="Phone Number" required>
                <Input value={form.phone} onChange={e => set("phone", e.target.value)}
                  placeholder="+251..." type="tel" className="rounded-xl h-11" />
              </Field>
              <Field label="Date of Birth">
                <Input value={form.date_of_birth} onChange={e => set("date_of_birth", e.target.value)}
                  type="date" className="rounded-xl h-11" />
              </Field>
              <Field label="Gender">
                <select value={form.gender} onChange={e => set("gender", e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Address">
                  <Input value={form.address} onChange={e => set("address", e.target.value)}
                    placeholder="City, Kebele, House No." className="rounded-xl h-11" />
                </Field>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card className="border border-border/60 rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-semibold">Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent className="pt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Contact Name">
                <Input value={form.emergency_contact_name} onChange={e => set("emergency_contact_name", e.target.value)}
                  placeholder="Full name" className="rounded-xl h-11" />
              </Field>
              <Field label="Contact Phone">
                <Input value={form.emergency_contact_phone} onChange={e => set("emergency_contact_phone", e.target.value)}
                  placeholder="+251..." type="tel" className="rounded-xl h-11" />
              </Field>
            </CardContent>
          </Card>

          {/* Medical Info */}
          <Card className="border border-border/60 rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-semibold">Medical Information</CardTitle>
              <CardDescription className="text-xs">Optional — fill what is available</CardDescription>
            </CardHeader>
            <CardContent className="pt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Blood Group">
                <select value={form.blood_group} onChange={e => set("blood_group", e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Unknown</option>
                  {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="Known Allergies">
                <Input value={form.allergies} onChange={e => set("allergies", e.target.value)}
                  placeholder="e.g. Penicillin, Pollen" className="rounded-xl h-11" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Chronic Conditions">
                  <Textarea value={form.chronic_conditions} onChange={e => set("chronic_conditions", e.target.value)}
                    placeholder="e.g. Diabetes Type 2, Hypertension" rows={2} className="rounded-xl resize-none" />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Additional Notes">
                  <Textarea value={form.notes} onChange={e => set("notes", e.target.value)}
                    placeholder="Any other relevant information" rows={2} className="rounded-xl resize-none" />
                </Field>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 pb-4">
            <Button type="button" variant="outline" className="rounded-xl px-6" onClick={() => navigate({ to: "/staff/patients" })}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl px-8 gap-2 shadow-md">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Registering...</> : <><UserPlus className="h-4 w-4" /> Register Patient</>}
            </Button>
          </div>
        </form>
      </StaffLayout>
    </StaffGuard>
  );
}
