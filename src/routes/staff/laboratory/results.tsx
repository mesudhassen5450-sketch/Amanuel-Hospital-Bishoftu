import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StaffGuard } from "@/components/staff/StaffGuard";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { useStaffAuth } from "@/lib/staff-auth";
import { getAllLabResults, deleteLabResult } from "@/lib/staff-server";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, TestTube, Search, RefreshCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/staff/laboratory/results")({
  head: () => ({ meta: [{ title: "Lab Results — Dr. Amanuel Hospital" }] }),
  component: LabResultsPage,
});

function LabResultsPage() {
  const { user } = useStaffAuth();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery]     = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try { setResults((await getAllLabResults()) as any[]); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [refreshKey]);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteLabResult({ data: { id, callerRole: user?.role ?? undefined } });
      setResults((prev) => prev.filter((row) => row.id !== id));
      toast.success("Lab result deleted from the database");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete lab result");
    } finally {
      setDeletingId(null);
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
    <StaffGuard allowedRoles={["laboratory", "staff", "doctor"]}>
      <StaffLayout>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground font-display flex items-center gap-2">
              <TestTube className="h-6 w-6 text-primary" /> Lab Results History
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{results.length} total results</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)} disabled={loading} className="gap-2 rounded-xl">
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <div className="relative mb-5">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search by patient, MRN, or test name..." className="pl-10 rounded-xl h-11 border-input/60" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading results...
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border border-dashed border-border/60 rounded-2xl">
            <CardContent className="py-16 text-center text-muted-foreground">
              <TestTube className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No lab results found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map(r => (
              <Card key={r.id} className="border border-border/60 rounded-2xl shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                    <div>
                      <p className="font-bold text-foreground text-base">{r.lab_requests?.test_name ?? "Unknown Test"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Patient: <span className="font-medium text-foreground">{r.patients?.full_name ?? "—"}</span>
                        {r.patients?.mrn && <span className="ml-2 font-mono text-primary">{r.patients.mrn}</span>}
                      </p>
                    </div>
                    <div className="text-right space-y-2">
                      <p className="text-xs text-muted-foreground">Completed</p>
                      <p className="text-xs font-medium">{new Date(r.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Tech: {r.technician_id}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs rounded-lg border-destructive/30 text-destructive hover:bg-destructive/5 gap-1"
                        disabled={deletingId === r.id}
                        onClick={() => handleDelete(r.id)}
                      >
                        {deletingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-secondary/20 rounded-xl p-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Result</p>
                      <p className="text-sm font-bold text-foreground">{r.result_value} {r.unit}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Reference Range</p>
                      <p className="text-sm font-medium">{r.reference_range}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Unit</p>
                      <p className="text-sm font-medium">{r.unit}</p>
                    </div>
                    {r.notes && (
                      <div className="sm:col-span-1">
                        <p className="text-xs text-muted-foreground mb-0.5">Notes</p>
                        <p className="text-sm">{r.notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </StaffLayout>
    </StaffGuard>
  );
}
