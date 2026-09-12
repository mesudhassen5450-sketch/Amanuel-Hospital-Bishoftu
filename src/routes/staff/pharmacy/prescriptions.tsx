import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StaffGuard } from "@/components/staff/StaffGuard";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { useStaffAuth } from "@/lib/staff-auth";
import { getPrescriptionsForPharmacy, dispensePrescription, deletePrescription } from "@/lib/staff-server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Pill, Search, RefreshCcw, Loader2, CheckCircle2, X, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff/pharmacy/prescriptions")({
  head: () => ({ meta: [{ title: "Prescriptions — Dr. Amanuel Hospital" }] }),
  component: PharmacyPrescriptionsPage,
});

const STATUS_STYLE: Record<string, string> = {
  "Pending":           "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "Ready":             "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "Partially Dispensed": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  "Completed":         "bg-green-600/10 text-green-700 border-green-600/20",
  "Cancelled":         "bg-destructive/10 text-destructive border-destructive/20",
};

function PharmacyPrescriptionsPage() {
  const { user } = useStaffAuth();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [query, setQuery]                 = useState("");
  const [refreshKey, setRefreshKey]       = useState(0);
  const [expanded, setExpanded]           = useState<Set<number>>(new Set());
  const [dispensing, setDispensing]       = useState<number | null>(null);
  const [confirmId, setConfirmId]         = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget]   = useState<any | null>(null);
  const [deleting, setDeleting]           = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getPrescriptionsForPharmacy({ data: {} });
      // Show only non-completed and non-cancelled on this page
      setPrescriptions((data as any[]).filter(p =>
        p.prescription_status !== "Completed" && p.prescription_status !== "Cancelled"
      ));
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [refreshKey]);

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDispense = async (id: number) => {
    setDispensing(id);
    setConfirmId(null);
    try {
      await dispensePrescription({ data: { prescriptionId: id, pharmacistUsername: user?.username ?? "pharmacy", callerRole: user?.role ?? undefined } });
      toast.success("Prescription dispensed successfully.");
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to dispense prescription.");
    } finally {
      setDispensing(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePrescription({ data: { id: deleteTarget.id, callerRole: user?.role ?? undefined } });
      setPrescriptions((prev) => prev.filter((row) => row.id !== deleteTarget.id));
      toast.success("Prescription deleted from the database");
      setDeleteTarget(null);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to delete prescription");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = prescriptions.filter(p => {
    const q = query.toLowerCase();
    return (
      p.patients?.full_name?.toLowerCase().includes(q) ||
      p.patients?.mrn?.toLowerCase().includes(q) ||
      p.doctor_username?.toLowerCase().includes(q)
    );
  });

  return (
    <StaffGuard allowedRoles={["pharmacy", "staff"]}>
      <StaffLayout>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground font-display flex items-center gap-2">
              <Pill className="h-6 w-6 text-primary" /> Prescriptions
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} pending prescription(s)</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)} disabled={loading} className="gap-2 rounded-xl">
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <div className="relative mb-5">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search by patient name, MRN, or doctor..."
            className="pl-10 rounded-xl h-11 border-input/60" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading...
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border border-dashed border-border/60 rounded-2xl">
            <CardContent className="py-16 text-center text-muted-foreground">
              <Pill className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No pending prescriptions</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(p => (
              <Card key={p.id} className="border border-border/60 rounded-2xl shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-foreground">{p.patients?.full_name ?? "Unknown"}</p>
                        <Badge variant="outline" className="font-mono text-xs bg-primary/5 border-primary/20 text-primary">
                          {p.patients?.mrn ?? "—"}
                        </Badge>
                        <Badge className={cn("rounded-full border text-xs font-semibold px-2.5",
                          STATUS_STYLE[p.prescription_status] ?? STATUS_STYLE.Pending)}>
                          {p.prescription_status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Dr. {p.doctor_username} · {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ·{" "}
                        {(p.prescription_items ?? []).length} medicine(s)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline"
                        className="h-8 text-xs rounded-lg gap-1 px-3"
                        onClick={() => toggleExpand(p.id)}>
                        {expanded.has(p.id) ? <><ChevronUp className="h-3.5 w-3.5" /> Hide</> : <><ChevronDown className="h-3.5 w-3.5" /> Details</>}
                      </Button>
                      {p.prescription_status !== "Completed" && p.prescription_status !== "Cancelled" && (
                        <Button size="sm"
                          className="h-8 text-xs rounded-lg bg-green-600 hover:bg-green-700 text-white gap-1.5 px-3"
                          onClick={() => setConfirmId(p.id)}
                          disabled={dispensing === p.id}>
                          {dispensing === p.id
                            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Dispensing...</>
                            : <><CheckCircle2 className="h-3.5 w-3.5" /> Dispense All</>
                          }
                        </Button>
                      )}
                      <Button size="sm" variant="outline"
                        className="h-8 w-8 p-0 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/5"
                        title="Delete prescription"
                        onClick={() => setDeleteTarget(p)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Medicine items (expanded) */}
                {expanded.has(p.id) && (
                  <CardContent className="pt-0 pb-4">
                    <div className="space-y-2">
                      {(p.prescription_items ?? []).map((item: any) => (
                        <div key={item.id} className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs bg-secondary/20 rounded-xl px-4 py-3">
                          <div><p className="text-muted-foreground mb-0.5">Medicine</p><p className="font-semibold">{item.medicine_name_snapshot}</p></div>
                          <div><p className="text-muted-foreground mb-0.5">Dosage</p><p className="font-medium">{item.dosage}</p></div>
                          <div><p className="text-muted-foreground mb-0.5">Frequency</p><p className="font-medium">{item.frequency}</p></div>
                          <div><p className="text-muted-foreground mb-0.5">Duration / Qty</p><p className="font-medium">{item.duration} · {item.quantity}</p></div>
                          <div><p className="text-muted-foreground mb-0.5">Status</p>
                            <Badge className={cn("rounded-full border text-xs font-semibold px-2",
                              item.dispensing_status === "Dispensed"
                                ? "bg-green-500/10 text-green-700 border-green-500/20"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/20")}>
                              {item.dispensing_status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {p.notes && <p className="text-xs text-muted-foreground italic px-1">Note: {p.notes}</p>}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Confirm dispense dialog */}
        {confirmId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="bg-green-500/10 p-3 rounded-xl text-green-600"><Pill className="h-6 w-6" /></div>
                <div>
                  <p className="font-bold text-foreground text-lg">Confirm Dispense</p>
                  <p className="text-xs text-muted-foreground">This will deduct stock and mark as completed</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Dispense all medicines in this prescription? Stock will be checked and reduced automatically.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setConfirmId(null)}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white gap-2"
                  onClick={() => handleDispense(confirmId!)}>
                  <CheckCircle2 className="h-4 w-4" /> Confirm
                </Button>
              </div>
            </div>
          </div>
        )}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
              <p className="font-bold text-foreground text-lg">Delete prescription</p>
              <p className="text-sm text-muted-foreground">
                This permanently deletes the prescription for <span className="font-semibold text-foreground">{deleteTarget.patients?.full_name ?? "this patient"}</span> from the database.
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
