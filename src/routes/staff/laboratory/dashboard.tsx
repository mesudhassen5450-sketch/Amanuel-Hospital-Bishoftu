import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StaffGuard } from "@/components/staff/StaffGuard";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { useStaffAuth } from "@/lib/staff-auth";
import { getLabDashboardStats, getLabRequests, deleteLabRequest } from "@/lib/staff-server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, TestTube, CheckCircle2, Clock, Loader2, RefreshCcw, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/staff/laboratory/dashboard")({
  head: () => ({ meta: [{ title: "Lab Dashboard — Dr. Amanuel Hospital" }] }),
  component: LabDashboardPage,
});

const STATUS_STYLE: Record<string, string> = {
  "Requested":       "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "Sample Collected":"bg-amber-500/10 text-amber-600 border-amber-500/20",
  "Processing":      "bg-purple-500/10 text-purple-600 border-purple-500/20",
  "Completed":       "bg-green-600/10 text-green-700 border-green-600/20",
  "Cancelled":       "bg-destructive/10 text-destructive border-destructive/20",
};

function LabDashboardPage() {
  const { user } = useStaffAuth();
  const [stats, setStats]   = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery]   = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([
        getLabDashboardStats(),
        getLabRequests({ data: {} }),
      ]);
      setStats(s as any);
      setRecent(r as any[]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = recent.filter(r => {
    const q = query.toLowerCase();
    return (
      r.patient?.full_name?.toLowerCase().includes(q) ||
      r.patient?.mrn?.toLowerCase().includes(q) ||
      r.testName?.toLowerCase().includes(q)
    );
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLabRequest({ data: { id: deleteTarget.id, callerRole: user?.role ?? undefined } });
      setRecent((prev) => prev.filter((row) => row.id !== deleteTarget.id));
      toast.success("Lab request deleted from the database");
      setDeleteTarget(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete lab request");
    } finally {
      setDeleting(false);
    }
  };

  const CARDS = stats ? [
    { label: "Today's Requests", value: stats.todayRequests, icon: FlaskConical, color: "text-primary",    bg: "bg-primary/10" },
    { label: "Pending",          value: stats.pending,       icon: Clock,        color: "text-amber-500",  bg: "bg-amber-500/10" },
    { label: "Processing",       value: stats.processing,    icon: TestTube,     color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Completed",        value: stats.completed,     icon: CheckCircle2, color: "text-green-600",  bg: "bg-green-500/10" },
  ] : [];

  return (
    <StaffGuard allowedRoles={["laboratory", "staff"]}>
      <StaffLayout>
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-display flex items-center gap-2">
              <FlaskConical className="h-7 w-7 text-primary" /> Lab Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              Welcome, <span className="font-semibold capitalize text-primary">{user?.username}</span>
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2 rounded-xl">
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48 text-slate-500 dark:text-slate-400 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {CARDS.map(({ label, value, icon: Icon, color, bg }) => (
                <Card key={label} className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{label}</p>
                      <p className={`text-3xl font-extrabold font-display ${color}`}>{value}</p>
                    </div>
                    <div className={`${bg} ${color} p-3 rounded-xl`}><Icon className="h-5 w-5" /></div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 max-w-xl">
              <Link to="/staff/laboratory/requests">
                <Card className="border border-slate-200 dark:border-slate-800 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors cursor-pointer rounded-2xl">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="bg-blue-500/15 p-3 rounded-xl text-blue-600 dark:text-blue-400"><FlaskConical className="h-6 w-6" /></div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Lab Requests</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Manage test requests</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link to="/staff/laboratory/results">
                <Card className="border border-slate-200 dark:border-slate-800 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/30 transition-colors cursor-pointer rounded-2xl">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="bg-emerald-500/15 p-3 rounded-xl text-emerald-600 dark:text-emerald-400"><TestTube className="h-6 w-6" /></div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Completed Results</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">View all results</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Recent requests */}
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">All Requests</h2>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Search by patient name, MRN, or test..." className="pl-10 rounded-xl h-11 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
                        <th className="px-4 py-3">Patient</th>
                        <th className="px-4 py-3">Test</th>
                        <th className="px-4 py-3">Doctor</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filtered.slice(0, 10).map(r => (
                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900 dark:text-white">{r.patient?.full_name ?? "—"}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{r.patient?.mrn ?? "—"}</p>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{r.testName}</td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 capitalize">{r.doctorUsername}</td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <Badge className={cn("rounded-full border text-xs font-semibold px-2.5", STATUS_STYLE[r.status] ?? STATUS_STYLE.Requested)}>
                              {r.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button size="sm" variant="outline"
                              className="h-7 w-7 p-0 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/5"
                              title="Delete lab request"
                              onClick={() => setDeleteTarget(r)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {filtered.length === 0 && (
                        <tr><td colSpan={6} className="text-center py-8 text-slate-500 dark:text-slate-400">No requests found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
              <p className="font-bold text-foreground text-lg">Delete lab request</p>
              <p className="text-sm text-muted-foreground">
                This permanently deletes <span className="font-semibold text-foreground">{deleteTarget.testName}</span> for{" "}
                <span className="font-semibold text-foreground">{deleteTarget.patient?.full_name ?? "this patient"}</span> from the database.
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
