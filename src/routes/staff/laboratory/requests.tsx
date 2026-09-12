import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StaffGuard } from "@/components/staff/StaffGuard";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { useStaffAuth } from "@/lib/staff-auth";
import { getLabRequests, updateLabRequestStatus, saveLabResult, deleteLabRequest } from "@/lib/staff-server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { FlaskConical, Search, RefreshCcw, Loader2, CheckCircle2, X, Eye, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff/laboratory/requests")({
  head: () => ({ meta: [{ title: "Lab Requests — Dr. Amanuel Hospital" }] }),
  component: LabRequestsPage,
});

const STATUS_STYLE: Record<string, string> = {
  "Requested":        "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "Sample Collected": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "Processing":       "bg-purple-500/10 text-purple-600 border-purple-500/20",
  "Completed":        "bg-green-600/10 text-green-700 border-green-600/20",
  "Cancelled":        "bg-destructive/10 text-destructive border-destructive/20",
};

const LAB_STATUSES = ["Requested", "Sample Collected", "Processing", "Completed", "Cancelled"];

type ResultModal = { requestId: number; patientId: number; testName: string } | null;

function LabRequestsPage() {
  const { user } = useStaffAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [query, setQuery]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshKey, setRefreshKey]     = useState(0);
  const [resultModal, setResultModal]   = useState<ResultModal>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [viewDetail, setViewDetail]     = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // Result form state
  const [resultForm, setResultForm] = useState({
    result_value: "", reference_range: "", unit: "", notes: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const rows = await getLabRequests({ data: {} });
      setRequests(rows as any[]);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [refreshKey]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLabRequest({ data: { id: deleteTarget.id, callerRole: user?.role ?? undefined } });
      toast.success("Lab request deleted from the database");
      setRequests((prev) => prev.filter((row) => row.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete lab request");
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

  const filtered = requests.filter(r => {
    const q = query.toLowerCase();
    const matchesQuery =
      r.patient?.full_name?.toLowerCase().includes(q) ||
      r.patient?.mrn?.toLowerCase().includes(q) ||
      r.testName?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <StaffGuard allowedRoles={["laboratory", "staff"]}>
      <StaffLayout>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground font-display flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-primary" /> Lab Requests
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} request(s) shown</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)} disabled={loading} className="gap-2 rounded-xl">
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search by patient, MRN, or test..." className="pl-10 rounded-xl h-11 border-input/60" />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-11 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary sm:w-52"
          >
            <option value="all">All Statuses</option>
            {LAB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading requests...
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border border-dashed border-border/60 rounded-2xl">
            <CardContent className="py-16 text-center text-muted-foreground">
              <FlaskConical className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No lab requests found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-2xl border border-border/60 overflow-hidden bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-secondary/30 border-b border-border/60 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Test Name</th>
                    <th className="px-4 py-3">Doctor</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filtered.map(r => (
                    <tr key={r.id} className="hover:bg-secondary/10 transition-colors">
                      <td className="px-4 py-3">
                        {r.patient?.mrn ? (
                          <Link
                            to="/staff/laboratory/patient/$mrn"
                            params={{ mrn: r.patient.mrn }}
                            className="group"
                          >
                            <p className="font-semibold text-primary hover:underline underline-offset-2 transition-colors">
                              {r.patient?.full_name ?? "—"}
                            </p>
                          </Link>
                        ) : (
                          <p className="font-semibold text-foreground">{r.patient?.full_name ?? "—"}</p>
                        )}
                        <p className="text-xs font-mono text-primary">{r.patient?.mrn ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{r.patient?.phone ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{r.testName}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{r.doctorUsername}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs max-w-[120px] truncate">
                        {r.clinicalNotes ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={cn("rounded-full border text-xs font-semibold px-2.5", STATUS_STYLE[r.status])}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {r.patient?.mrn ? (
                            <Link
                              to="/staff/laboratory/patient/$mrn"
                              params={{ mrn: r.patient.mrn }}
                            >
                              <Button size="sm" variant="outline"
                                className="h-7 text-xs rounded-lg border-primary/30 text-primary hover:bg-primary/5 gap-1 px-2.5">
                                <Eye className="h-3.5 w-3.5" /> View
                              </Button>
                            </Link>
                          ) : (
                            <Button size="sm" variant="outline"
                              className="h-7 text-xs rounded-lg border-primary/30 text-primary hover:bg-primary/5 gap-1 px-2.5"
                              onClick={() => setViewDetail(r)}>
                              <Eye className="h-3.5 w-3.5" /> View
                            </Button>
                          )}
                          {r.status === "Requested" && (
                            <Button size="sm" className="h-7 text-xs rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-2.5"
                              onClick={() => handleStatusChange(r.id, "Sample Collected")}>
                              Collect
                            </Button>
                          )}
                          {r.status === "Sample Collected" && (
                            <Button size="sm" className="h-7 text-xs rounded-lg bg-purple-600 hover:bg-purple-700 text-white px-2.5"
                              onClick={() => handleStatusChange(r.id, "Processing")}>
                              Processing
                            </Button>
                          )}
                          {(r.status === "Processing" || r.status === "Sample Collected") && (
                            <Button size="sm" className="h-7 text-xs rounded-lg bg-green-600 hover:bg-green-700 text-white gap-1 px-2.5"
                              onClick={() => setResultModal({ requestId: r.id, patientId: r.patientId, testName: r.testName })}>
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
                            onClick={() => setDeleteTarget(r)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Result Entry Modal */}
        {resultModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <Card className="w-full max-w-lg rounded-2xl shadow-2xl border border-border bg-card">
              <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Enter Result — {resultModal.testName}
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setResultModal(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <form onSubmit={handleSaveResult}>
                <CardContent className="pt-5 space-y-4 max-h-[70vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-semibold text-sm">Result Value <span className="text-destructive">*</span></Label>
                      <Input value={resultForm.result_value}
                        onChange={e => setResultForm(f => ({ ...f, result_value: e.target.value }))}
                        placeholder="e.g. 13.5" className="rounded-xl h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold text-sm">Unit <span className="text-destructive">*</span></Label>
                      <Input value={resultForm.unit}
                        onChange={e => setResultForm(f => ({ ...f, unit: e.target.value }))}
                        placeholder="e.g. g/dL, mg/dL, %" className="rounded-xl h-11" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm">Reference Range <span className="text-destructive">*</span></Label>
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
                  <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setResultModal(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting} className="flex-1 rounded-xl gap-2">
                    {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><CheckCircle2 className="h-4 w-4" /> Save Result</>}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
        {/* Inline request detail panel — for requests without a linked patient/MRN */}
        {viewDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <Card className="w-full max-w-lg rounded-2xl shadow-2xl border border-border bg-card">
              <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-primary" />
                  Lab Request Details
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setViewDetail(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Test Name</p>
                    <p className="font-semibold text-foreground">{viewDetail.testName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Status</p>
                    <Badge className={cn("rounded-full border text-xs font-semibold px-2.5", STATUS_STYLE[viewDetail.status])}>
                      {viewDetail.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Requesting Doctor</p>
                    <p className="font-medium capitalize">{viewDetail.doctorUsername}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Request Date</p>
                    <p className="font-medium">{new Date(viewDetail.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-0.5">Clinical Notes</p>
                    <p className="font-medium">{viewDetail.clinicalNotes || "—"}</p>
                  </div>
                  <div className="col-span-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                    <p className="text-xs text-amber-700 font-semibold">
                      ⚠ This request has no linked patient record. Ask reception to register and link the patient to view full profile.
                    </p>
                  </div>
                </div>
              </CardContent>
              <div className="px-6 py-4 border-t border-border/40">
                <Button variant="outline" className="w-full rounded-xl" onClick={() => setViewDetail(null)}>
                  Close
                </Button>
              </div>
            </Card>
          </div>
        )}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
              <p className="font-bold text-foreground text-lg">Delete lab request</p>
              <p className="text-sm text-muted-foreground">
                This removes <span className="font-semibold text-foreground">{deleteTarget.testName}</span> for{" "}
                <span className="font-semibold text-foreground">{deleteTarget.patient?.full_name ?? "this patient"}</span> from the database.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                  Cancel
                </Button>
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
