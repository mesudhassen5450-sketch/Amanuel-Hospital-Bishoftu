import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StaffGuard } from "@/components/staff/StaffGuard";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { useStaffAuth } from "@/lib/staff-auth";
import { getAllLabResults, deleteLabResult } from "@/lib/staff-server";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, TestTube, Search, RefreshCcw, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/staff/doctor/lab-results")({
  head: () => ({ meta: [{ title: "Lab Results — Dr. Amanuel Hospital" }] }),
  component: DoctorLabResultsPage,
});

function DoctorLabResultsPage() {
  const { user } = useStaffAuth();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery]     = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setResults((await getAllLabResults()) as any[]); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [refreshKey]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLabResult({ data: { id: deleteTarget.id, callerRole: user?.role ?? undefined } });
      setResults((prev) => prev.filter((row) => row.id !== deleteTarget.id));
      toast.success("Lab result deleted from the database");
      setDeleteTarget(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete lab result");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = results.filter(r => {
    const q = query.toLowerCase();
    return (
      r.patients?.full_name?.toLowerCase().includes(q) ||
      r.patients?.mrn?.toLowerCase().includes(q) ||
      r.lab_requests?.test_name?.toLowerCase().includes(q)
    );
  });

  return (
    <StaffGuard allowedRoles={["doctor", "staff"]}>
      <StaffLayout>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground font-display flex items-center gap-2">
              <TestTube className="h-6 w-6 text-primary" /> Laboratory Results
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">All completed laboratory tests</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)} disabled={loading} className="gap-2 rounded-xl">
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <div className="relative mb-5">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search by patient name, MRN, or test..." className="pl-10 rounded-xl h-11 border-input/60" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading...
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border border-dashed border-border/60 rounded-2xl">
            <CardContent className="py-16 text-center text-muted-foreground">
              <TestTube className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No lab results yet</p>
              <p className="text-xs mt-1">Results appear after the lab team completes tests</p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-2xl border border-border/60 overflow-hidden bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-secondary/30 border-b border-border/60 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Test</th>
                    <th className="px-4 py-3">Result</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filtered.map(r => (
                    <tr key={r.id} className="hover:bg-secondary/10 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{r.patients?.full_name ?? "—"}</p>
                        <p className="text-xs font-mono text-primary">{r.patients?.mrn ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 font-medium">{r.lab_requests?.test_name ?? "—"}</td>
                      <td className="px-4 py-3 font-bold text-foreground">{r.result_value}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.reference_range}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.unit}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[150px] truncate">{r.notes ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {r.patients?.mrn && (
                            <Link
                              to="/staff/doctor/patient/$mrn"
                              params={{ mrn: r.patients.mrn }}
                              search={{ appointmentId: undefined }}
                            >
                              <Button size="sm" variant="outline"
                                className="h-7 text-xs rounded-lg border-primary/30 text-primary hover:bg-primary/5 gap-1 px-2.5">
                                <Eye className="h-3.5 w-3.5" /> View Patient
                              </Button>
                            </Link>
                          )}
                          <Button size="sm" variant="outline"
                            className="h-7 w-7 p-0 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/5"
                            title="Delete lab result"
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
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
              <p className="font-bold text-foreground text-lg">Delete lab result</p>
              <p className="text-sm text-muted-foreground">
                This permanently deletes the result for <span className="font-semibold text-foreground">{deleteTarget.patients?.full_name ?? "this patient"}</span> from the database.
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
