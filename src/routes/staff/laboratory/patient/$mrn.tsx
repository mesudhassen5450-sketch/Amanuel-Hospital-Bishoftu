import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StaffGuard } from "@/components/staff/StaffGuard";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { useStaffAuth } from "@/lib/staff-auth";
import {
  getPatientByMRN,
  getLabRequests,
  getPatientLabResults,
  updateLabRequestStatus,
  saveLabResult,
  deleteLabRequest,
  deleteLabResult,
} from "@/lib/staff-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ChevronLeft, Loader2, User, Phone, Calendar, MapPin,
  Heart, AlertTriangle, Activity, FlaskConical, TestTube,
  CheckCircle2, X, RefreshCcw, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff/laboratory/patient/$mrn")({
  head: () => ({ meta: [{ title: "Lab Patient Profile — Dr. Amanuel Hospital" }] }),
  component: LabPatientProfilePage,
});

// ── Shared helpers ─────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3">
      <div className="bg-primary/10 p-2 rounded-xl text-primary mt-0.5 shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">
          {value || <span className="text-muted-foreground italic">Not recorded</span>}
        </p>
      </div>
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  "Requested":        "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "Sample Collected": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "Processing":       "bg-purple-500/10 text-purple-600 border-purple-500/20",
  "Completed":        "bg-green-600/10 text-green-700 border-green-600/20",
  "Cancelled":        "bg-destructive/10 text-destructive border-destructive/20",
};

type ResultModal = { requestId: number; patientId: number; testName: string } | null;

// ── Page ──────────────────────────────────────────────────────────────────────
function LabPatientProfilePage() {
  const { mrn } = Route.useParams();
  const { user } = useStaffAuth();

  const [patient, setPatient]       = useState<any>(null);
  const [requests, setRequests]     = useState<any[]>([]);
  const [results, setResults]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError]           = useState("");

  // Result entry modal
  const [resultModal, setResultModal] = useState<ResultModal>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [resultForm, setResultForm]   = useState({
    result_value: "", reference_range: "", unit: "", notes: "",
  });
  const [deleteTarget, setDeleteTarget] = useState<{ type: "request" | "result"; row: any } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load patient + their lab data
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const p = await getPatientByMRN({ data: { mrn } }) as any;
        setPatient(p);

        // Get all lab requests for this patient by filtering by patient_id
        const allReqs = await getLabRequests({ data: {} }) as any[];
        setRequests(allReqs.filter(r => r.patientId === p.id));

        // Get completed results
        const res = await getPatientLabResults({ data: { patientId: p.id } }) as any[];
        setResults(res);
      } catch (e: any) {
        setError(e.message ?? "Failed to load patient.");
      } finally {
        setLoading(false);
      }
    })();
  }, [mrn, refreshKey]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === "request") {
        await deleteLabRequest({ data: { id: deleteTarget.row.id, callerRole: user?.role ?? undefined } });
        setRequests((prev) => prev.filter((row) => row.id !== deleteTarget.row.id));
        toast.success("Lab request deleted from the database");
      } else {
        await deleteLabResult({ data: { id: deleteTarget.row.id, callerRole: user?.role ?? undefined } });
        setResults((prev) => prev.filter((row) => row.id !== deleteTarget.row.id));
        toast.success("Lab result deleted from the database");
      }
      setDeleteTarget(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete record");
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await updateLabRequestStatus({ data: { id, status, callerRole: user?.role ?? undefined } });
      toast.success(`Status updated to: ${status}`);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch (e: any) { toast.error(e.message); }
  };

  const handleSaveResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resultModal) return;
    if (!resultForm.result_value.trim()) { toast.error("Result value is required."); return; }
    if (!resultForm.reference_range.trim()) { toast.error("Reference range is required."); return; }
    if (!resultForm.unit.trim()) { toast.error("Unit is required."); return; }
    setSubmitting(true);
    try {
      await saveLabResult({
        data: {
          lab_request_id: resultModal.requestId,
          patient_id:     resultModal.patientId,
          technician_id:  user?.username ?? "laboratory",
          result_value:   resultForm.result_value.trim(),
          reference_range: resultForm.reference_range.trim(),
          unit:           resultForm.unit.trim(),
          notes:          resultForm.notes || undefined,
          callerRole:     user?.role ?? undefined,
        },
      });
      toast.success("Lab result saved. Request marked as Completed.");
      setResultModal(null);
      setResultForm({ result_value: "", reference_range: "", unit: "", notes: "" });
      setRefreshKey(k => k + 1);
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading) return (
    <StaffGuard allowedRoles={["laboratory", "staff", "doctor"]}>
      <StaffLayout>
        <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading patient profile...
        </div>
      </StaffLayout>
    </StaffGuard>
  );

  if (error || !patient) return (
    <StaffGuard allowedRoles={["laboratory", "staff", "doctor"]}>
      <StaffLayout>
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg font-semibold">Patient not found</p>
          <p className="text-sm mt-1">{error}</p>
          <Link to="/staff/laboratory/requests">
            <Button variant="outline" className="mt-4 rounded-xl">Back to Lab Requests</Button>
          </Link>
        </div>
      </StaffLayout>
    </StaffGuard>
  );

  return (
    <StaffGuard allowedRoles={["laboratory", "staff", "doctor"]}>
      <StaffLayout>

        {/* ── Patient Header ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Link to="/staff/laboratory/requests"
              className="text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-extrabold text-foreground font-display">
                  {patient.full_name}
                </h1>
                <Badge className="font-mono text-xs bg-primary/10 text-primary border-primary/20 border">
                  {patient.mrn}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Registered {new Date(patient.created_at).toLocaleDateString("en-US", {
                  year: "numeric", month: "long", day: "numeric",
                })}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm"
            onClick={() => setRefreshKey(k => k + 1)}
            className="gap-2 rounded-xl">
            <RefreshCcw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-6xl">

          {/* ── Personal Information ──────────────────────────────────────── */}
          <Card className="lg:col-span-2 border border-border/60 rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InfoRow icon={User}     label="Full Name"     value={patient.full_name} />
              <InfoRow icon={Phone}    label="Phone Number"  value={patient.phone} />
              <InfoRow icon={Calendar} label="Date of Birth" value={patient.date_of_birth} />
              <InfoRow icon={User}     label="Gender"        value={patient.gender} />
              <div className="sm:col-span-2">
                <InfoRow icon={MapPin} label="Address" value={patient.address} />
              </div>
              <InfoRow icon={Phone} label="Emergency Contact"       value={patient.emergency_contact_name} />
              <InfoRow icon={Phone} label="Emergency Contact Phone" value={patient.emergency_contact_phone} />
            </CardContent>
          </Card>

          {/* ── Medical Information ───────────────────────────────────────── */}
          <Card className="border border-border/60 rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Medical Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <InfoRow icon={Heart}         label="Blood Group"        value={patient.blood_group} />
              <InfoRow icon={AlertTriangle} label="Allergies"          value={patient.allergies} />
              <InfoRow icon={Activity}      label="Chronic Conditions" value={patient.chronic_conditions} />
              <InfoRow icon={User}          label="Additional Notes"   value={patient.notes} />
            </CardContent>
          </Card>

          {/* ── Laboratory Requests ──────────────────────────────────────────── */}
          <Card className="lg:col-span-3 border border-border/60 rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-primary" />
                Laboratory Requests
                <Badge variant="outline" className="ml-1 text-xs font-semibold bg-primary/5 border-primary/20 text-primary">
                  {requests.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {requests.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <FlaskConical className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No lab requests for this patient yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-secondary/30 border-b border-border/60 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                        <th className="px-4 py-3">Test Name</th>
                        <th className="px-4 py-3">Doctor</th>
                        <th className="px-4 py-3">Request Date</th>
                        <th className="px-4 py-3">Clinical Notes</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {requests.map(r => (
                        <tr key={r.id} className="hover:bg-secondary/10 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">{r.testName}</td>
                          <td className="px-4 py-3 text-muted-foreground capitalize">{r.doctorUsername}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                            {new Date(r.createdAt).toLocaleDateString("en-US", {
                              month: "short", day: "numeric", year: "numeric",
                            })}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs max-w-[160px] truncate">
                            {r.clinicalNotes ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={cn("rounded-full border text-xs font-semibold px-2.5",
                              STATUS_STYLE[r.status] ?? STATUS_STYLE["Requested"])}>
                              {r.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {r.status === "Requested" && (
                                <Button size="sm"
                                  className="h-7 text-xs rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-2.5"
                                  onClick={() => handleStatusChange(r.id, "Sample Collected")}>
                                  Collect
                                </Button>
                              )}
                              {r.status === "Sample Collected" && (
                                <Button size="sm"
                                  className="h-7 text-xs rounded-lg bg-purple-600 hover:bg-purple-700 text-white px-2.5"
                                  onClick={() => handleStatusChange(r.id, "Processing")}>
                                  Processing
                                </Button>
                              )}
                              {(r.status === "Processing" || r.status === "Sample Collected") && (
                                <Button size="sm"
                                  className="h-7 text-xs rounded-lg bg-green-600 hover:bg-green-700 text-white gap-1 px-2.5"
                                  onClick={() => setResultModal({
                                    requestId: r.id,
                                    patientId: r.patientId,
                                    testName:  r.testName,
                                  })}>
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Enter Result
                                </Button>
                              )}
                              {r.status !== "Cancelled" && r.status !== "Completed" && (
                                <Button size="sm" variant="outline"
                                  className="h-7 text-xs rounded-lg border-destructive/30 text-destructive hover:bg-destructive/5 px-2.5"
                                  onClick={() => handleStatusChange(r.id, "Cancelled")}>
                                  Cancel
                                </Button>
                              )}
                              <Button size="sm" variant="outline"
                                className="h-7 w-7 p-0 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/5"
                                title="Delete lab request"
                                onClick={() => setDeleteTarget({ type: "request", row: r })}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Laboratory Results ────────────────────────────────────────────── */}
          <Card className="lg:col-span-3 border border-border/60 rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TestTube className="h-4 w-4 text-primary" />
                Completed Results
                <Badge variant="outline" className="ml-1 text-xs font-semibold bg-green-500/10 border-green-500/20 text-green-700">
                  {results.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {results.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  <TestTube className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No completed results yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {results.map((r: any) => (
                    <div key={r.id}
                      className="border border-border/50 rounded-xl p-4 bg-secondary/10 space-y-3">
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div>
                          <p className="font-bold text-foreground">
                            {r.lab_requests?.test_name ?? "Unknown Test"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Requested by Dr. {r.lab_requests?.doctor_username ?? "—"} ·{" "}
                            Tech: <span className="capitalize">{r.technician_id}</span> ·{" "}
                            {new Date(r.created_at).toLocaleDateString("en-US", {
                              month: "short", day: "numeric", year: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-600/10 text-green-700 border-green-600/20 border rounded-full text-xs font-semibold px-2.5">
                            Completed
                          </Badge>
                          <Button size="sm" variant="outline"
                            className="h-7 w-7 p-0 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/5"
                            title="Delete lab result"
                            onClick={() => setDeleteTarget({ type: "result", row: r })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-background border border-border/40 rounded-xl p-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Result</p>
                          <p className="text-sm font-bold text-foreground">
                            {r.result_value} {r.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Reference Range</p>
                          <p className="text-sm font-medium">{r.reference_range}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Unit</p>
                          <p className="text-sm font-medium">{r.unit}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Completed</p>
                          <p className="text-sm font-medium">
                            {new Date(r.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {r.notes && (
                          <div className="col-span-2 sm:col-span-4">
                            <p className="text-xs text-muted-foreground mb-0.5">Notes</p>
                            <p className="text-sm">{r.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>{/* end grid */}

        {/* ── Result Entry Modal ─────────────────────────────────────────────── */}
        {resultModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <Card className="w-full max-w-lg rounded-2xl shadow-2xl border border-border bg-card">
              <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Enter Result — {resultModal.testName}
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg"
                  onClick={() => setResultModal(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <form onSubmit={handleSaveResult}>
                <CardContent className="pt-5 space-y-4 max-h-[70vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-semibold text-sm">
                        Result Value <span className="text-destructive">*</span>
                      </Label>
                      <Input value={resultForm.result_value}
                        onChange={e => setResultForm(f => ({ ...f, result_value: e.target.value }))}
                        placeholder="e.g. 13.5" className="rounded-xl h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold text-sm">
                        Unit <span className="text-destructive">*</span>
                      </Label>
                      <Input value={resultForm.unit}
                        onChange={e => setResultForm(f => ({ ...f, unit: e.target.value }))}
                        placeholder="e.g. g/dL, mg/dL, %" className="rounded-xl h-11" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm">
                      Reference Range <span className="text-destructive">*</span>
                    </Label>
                    <Input value={resultForm.reference_range}
                      onChange={e => setResultForm(f => ({ ...f, reference_range: e.target.value }))}
                      placeholder="e.g. 12.0–17.5 g/dL (Male)" className="rounded-xl h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm">Notes</Label>
                    <Textarea value={resultForm.notes}
                      onChange={e => setResultForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Additional observations or comments..."
                      rows={3} className="rounded-xl resize-none" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Technician: <strong>{user?.username}</strong> · Submitting will mark this request as <strong>Completed</strong>.
                  </p>
                </CardContent>
                <div className="flex gap-3 px-6 py-4 border-t border-border/40">
                  <Button type="button" variant="outline" className="flex-1 rounded-xl"
                    onClick={() => setResultModal(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting} className="flex-1 rounded-xl gap-2">
                    {submitting
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                      : <><CheckCircle2 className="h-4 w-4" /> Save Result</>
                    }
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
              <p className="font-bold text-foreground text-lg">
                {deleteTarget.type === "request" ? "Delete lab request" : "Delete lab result"}
              </p>
              <p className="text-sm text-muted-foreground">
                This permanently deletes this laboratory record from the database.
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
