import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StaffGuard } from "@/components/staff/StaffGuard";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { useStaffAuth } from "@/lib/staff-auth";
import { getDoctorQueue, deletePaymentRecord } from "@/lib/staff-server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Search, RefreshCcw, Loader2, Clock, Stethoscope, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff/doctor/queue")({
  head: () => ({ meta: [{ title: "Patient Queue — Dr. Amanuel Hospital" }] }),
  component: DoctorQueuePage,
});

const STATUS_STYLE: Record<string, string> = {
  checked_in: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  waiting:    "bg-amber-500/10 text-amber-600 border-amber-500/20",
  completed:  "bg-green-600/10 text-green-700 border-green-600/20",
};
const STATUS_LABEL: Record<string, string> = {
  checked_in: "Checked In", waiting: "Waiting", completed: "Completed",
};

function DoctorQueuePage() {
  const { user } = useStaffAuth();
  const [appts, setAppts]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery]   = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async (date?: string) => {
    setLoading(true);
    try {
      const data = await getDoctorQueue({ data: { date: date || undefined } });
      setAppts(data as any[]);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(dateFilter); }, [dateFilter, refreshKey]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePaymentRecord({ data: { id: deleteTarget.id, callerRole: user?.role ?? undefined } });
      setAppts((prev) => prev.filter((row) => row.id !== deleteTarget.id));
      toast.success("Patient queue record deleted from the database");
      setDeleteTarget(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete record");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = appts.filter(a => {
    const q = query.toLowerCase();
    return (
      a.fullName?.toLowerCase().includes(q) ||
      a.phone?.includes(q) ||
      (a.patientMRN && a.patientMRN.toLowerCase().includes(q))
    );
  });

  // Sort: waiting first, then checked_in, then completed
  const ORDER: Record<string, number> = { waiting: 0, checked_in: 1, completed: 2 };
  const sorted = [...filtered].sort((a, b) =>
    (ORDER[a.visitStatus] ?? 9) - (ORDER[b.visitStatus] ?? 9)
  );

  return (
    <StaffGuard allowedRoles={["doctor", "staff"]}>
      <StaffLayout>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground font-display flex items-center gap-2">
              <Clock className="h-6 w-6 text-primary" /> Patient Queue
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {sorted.filter(a => a.visitStatus === "waiting").length} waiting ·{" "}
              {sorted.filter(a => a.visitStatus === "checked_in").length} checked in
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)} disabled={loading} className="gap-2 rounded-xl">
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, MRN, or phone..." className="pl-10 rounded-xl h-11 border-input/60" />
          </div>
          <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
            className="rounded-xl h-11 border-input/60 sm:w-44" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading queue...
          </div>
        ) : sorted.length === 0 ? (
          <Card className="border border-dashed border-border/60 rounded-2xl">
            <CardContent className="py-16 text-center text-muted-foreground">
              <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No patients in queue</p>
              <p className="text-xs mt-1">Waiting and checked-in patients will appear here</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sorted.map((a, idx) => (
              <Card key={a.id} className={cn(
                "border border-border/60 bg-card shadow-sm rounded-2xl transition-all hover:shadow-md",
                a.visitStatus === "waiting" && "border-amber-500/30 bg-amber-500/5"
              )}>
                <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    {/* Queue number */}
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0",
                      a.visitStatus === "waiting"    ? "bg-amber-500 text-white" :
                      a.visitStatus === "checked_in" ? "bg-blue-500 text-white" :
                      "bg-green-600 text-white"
                    )}>
                      {idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-foreground">{a.fullName}</p>
                        {a.patientMRN && (
                          <Badge variant="outline" className="font-mono text-xs bg-primary/5 border-primary/20 text-primary">
                            {a.patientMRN}
                          </Badge>
                        )}
                        <Badge className={cn("rounded-full border text-xs font-semibold px-2.5", STATUS_STYLE[a.visitStatus])}>
                          {STATUS_LABEL[a.visitStatus] ?? a.visitStatus}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {a.phone} · {a.appointmentDate} at {a.appointmentTime}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.patientMRN ? (
                      <Link to="/staff/doctor/patient/$mrn" params={{ mrn: a.patientMRN }}
                        search={{ appointmentId: a.id }}>
                        <Button size="sm" className="gap-1.5 rounded-xl shadow-sm">
                          <Stethoscope className="h-4 w-4" /> Consult
                        </Button>
                      </Link>
                    ) : (
                      <Button size="sm" variant="outline" disabled className="rounded-xl opacity-50 text-xs">
                        No MRN — link patient first
                      </Button>
                    )}
                    <Button size="sm" variant="outline"
                      className="h-8 w-8 p-0 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/5"
                      title="Delete record"
                      onClick={() => setDeleteTarget(a)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
              <p className="font-bold text-foreground text-lg">Delete queue record</p>
              <p className="text-sm text-muted-foreground">
                This permanently deletes the appointment for <span className="font-semibold text-foreground">{deleteTarget.fullName}</span> from the database.
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
