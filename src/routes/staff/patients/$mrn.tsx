import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StaffGuard } from "@/components/staff/StaffGuard";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { getPatientByMRN, getPatientConsultations, deletePatientRecord, deleteConsultation } from "@/lib/staff-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  User, Phone, Calendar, MapPin, Heart, AlertTriangle,
  Activity, ChevronLeft, Loader2, ClipboardList, Pencil, Stethoscope, Trash2
} from "lucide-react";
import { useStaffAuth } from "@/lib/staff-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/staff/patients/$mrn")({
  head: () => ({ meta: [{ title: "Patient Profile — Dr. Amanuel Hospital" }] }),
  component: PatientProfilePage,
});

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3">
      <div className="bg-primary/10 p-2 rounded-xl text-primary mt-0.5 shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value || <span className="text-muted-foreground italic">Not recorded</span>}</p>
      </div>
    </div>
  );
}

function PatientProfilePage() {
  const { mrn } = Route.useParams();
  const { user } = useStaffAuth();
  const navigate = useNavigate();
  const [patient, setPatient]             = useState<any>(null);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [deleteTarget, setDeleteTarget]   = useState<{ type: "patient" | "consultation"; row: any } | null>(null);
  const [deleting, setDeleting]           = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const p = await getPatientByMRN({ data: { mrn } }) as any;
        setPatient(p);
        // Fetch consultations using the patient's numeric id
        if (p?.id) {
          const c = await getPatientConsultations({ data: { patientId: p.id } });
          setConsultations(c as any[]);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [mrn]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === "patient") {
        await deletePatientRecord({ data: { id: deleteTarget.row.id, callerRole: user?.role ?? undefined } });
        toast.success("Patient record deleted from the database");
        setDeleteTarget(null);
        navigate({ to: "/staff/patients" });
        return;
      }
      await deleteConsultation({ data: { id: deleteTarget.row.id, callerRole: user?.role ?? undefined } });
      setConsultations((prev) => prev.filter((row) => row.id !== deleteTarget.row.id));
      toast.success("Consultation deleted from the database");
      setDeleteTarget(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete record");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return (
    <StaffGuard allowedRoles={["reception", "staff"]}><StaffLayout>
      <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading patient...
      </div>
    </StaffLayout></StaffGuard>
  );

  if (error || !patient) return (
    <StaffGuard allowedRoles={["reception", "staff"]}><StaffLayout>
      <div className="text-center py-20 text-muted-foreground">
        <p className="text-lg font-semibold">Patient not found</p>
        <Link to="/staff/patients"><Button variant="outline" className="mt-4 rounded-xl">Back to Patients</Button></Link>
      </div>
    </StaffLayout></StaffGuard>
  );

  return (
    <StaffGuard allowedRoles={["reception", "staff"]}>
      <StaffLayout>
        {/* Back + header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Link to="/staff/patients" className="text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-extrabold text-foreground font-display">{patient.full_name}</h1>
                <Badge className="font-mono text-xs bg-primary/10 text-primary border-primary/20 border">
                  {patient.mrn}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Registered {new Date(patient.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 rounded-xl" disabled>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
            <Button variant="outline" size="sm"
              className="gap-2 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/5"
              onClick={() => setDeleteTarget({ type: "patient", row: patient })}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">
          {/* Personal info */}
          <Card className="lg:col-span-2 border border-border/60 rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InfoRow icon={User}     label="Full Name"    value={patient.full_name} />
              <InfoRow icon={Phone}    label="Phone"        value={patient.phone} />
              <InfoRow icon={Calendar} label="Date of Birth" value={patient.date_of_birth} />
              <InfoRow icon={User}     label="Gender"       value={patient.gender} />
              <InfoRow icon={MapPin}   label="Address"      value={patient.address} />
            </CardContent>
          </Card>

          {/* Emergency contact */}
          <Card className="border border-border/60 rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" /> Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <InfoRow icon={User}  label="Name"  value={patient.emergency_contact_name} />
              <InfoRow icon={Phone} label="Phone" value={patient.emergency_contact_phone} />
            </CardContent>
          </Card>

          {/* Medical info */}
          <Card className="lg:col-span-2 border border-border/60 rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Medical Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InfoRow icon={Heart}         label="Blood Group"         value={patient.blood_group} />
              <InfoRow icon={AlertTriangle} label="Allergies"           value={patient.allergies} />
              <div className="sm:col-span-2">
                <InfoRow icon={Activity} label="Chronic Conditions" value={patient.chronic_conditions} />
              </div>
              <div className="sm:col-span-2">
                <InfoRow icon={ClipboardList} label="Notes" value={patient.notes} />
              </div>
            </CardContent>
          </Card>

          {/* Consultation History — live from Supabase */}
          <Card className="lg:col-span-3 border border-border/60 rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-primary" />
                Consultation History
                <Badge variant="outline" className="ml-1 text-xs font-semibold bg-primary/5 border-primary/20 text-primary">
                  {consultations.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            {consultations.length === 0 ? (
              <CardContent className="py-10 text-center text-muted-foreground">
                <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No consultation history recorded yet.</p>
              </CardContent>
            ) : (
              <CardContent className="pt-4 space-y-4">
                {consultations.map(c => (
                  <div key={c.id} className="border border-border/50 rounded-xl p-4 bg-secondary/10 space-y-3">
                    {/* Header row */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-foreground">
                          {new Date(c.created_at).toLocaleDateString("en-US", {
                            year: "numeric", month: "long", day: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground capitalize">
                          Dr. {c.doctor_username}
                        </span>
                        <Button size="sm" variant="outline"
                          className="h-7 w-7 p-0 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/5"
                          title="Delete consultation"
                          onClick={() => setDeleteTarget({ type: "consultation", row: c })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Main fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Chief Complaint</p>
                        <p className="text-foreground">{c.chief_complaint}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Diagnosis</p>
                        <p className="text-foreground font-medium">{c.diagnosis}</p>
                      </div>
                      {c.history_of_present_illness && (
                        <div className="sm:col-span-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">History of Present Illness</p>
                          <p className="text-foreground">{c.history_of_present_illness}</p>
                        </div>
                      )}
                    </div>

                    {/* Vital signs */}
                    {(c.blood_pressure || c.temperature || c.pulse_rate || c.weight || c.height) && (
                      <div className="bg-background border border-border/40 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {[
                          ["Blood Pressure", c.blood_pressure],
                          ["Temperature",    c.temperature],
                          ["Pulse Rate",     c.pulse_rate],
                          ["Weight",         c.weight],
                          ["Height",         c.height],
                        ].filter(([, v]) => v).map(([label, val]) => (
                          <div key={label as string}>
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className="text-sm font-semibold text-foreground">{val}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Treatment plan */}
                    {c.treatment_plan && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Treatment Plan</p>
                        <p className="text-sm text-foreground">{c.treatment_plan}</p>
                      </div>
                    )}

                    {/* Additional notes */}
                    {c.additional_notes && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Additional Notes</p>
                        <p className="text-sm text-foreground">{c.additional_notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        </div>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
              <p className="font-bold text-foreground text-lg">
                {deleteTarget.type === "patient" ? "Delete patient" : "Delete consultation"}
              </p>
              <p className="text-sm text-muted-foreground">
                This permanently deletes this record from the database.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
                <Button className="flex-1 rounded-xl bg-destructive text-white hover:bg-destructive/90 gap-2" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting...</> : <><Trash2 className="h-4 w-4" /> Delete</>}
                </Button>
              </div>
            </div>
          </div>
        )}
      </StaffLayout>
    </StaffGuard>
  );
}
