import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StaffGuard } from "@/components/staff/StaffGuard";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { useStaffAuth } from "@/lib/staff-auth";
import { getReceptionAppointments, confirmCashPayment, deletePaymentRecord } from "@/lib/staff-server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, CreditCard, Search, CheckCircle2, RefreshCcw, AlertCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff/payments")({
  head: () => ({ meta: [{ title: "Payments — Dr. Amanuel Hospital" }] }),
  component: PaymentsPage,
});

const PAY_STYLE: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  paid:    "bg-green-500/10 text-green-700 border-green-500/20",
  failed:  "bg-destructive/10 text-destructive border-destructive/20",
};

const METHOD_LABEL: Record<string, string> = {
  telebirr: "Telebirr", cbe_birr: "CBE Birr", card: "Card", cash: "Cash",
};

function PaymentsPage() {
  const { user } = useStaffAuth();
  const [appts, setAppts]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [query, setQuery]       = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Confirm dialog state
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; name: string; amount: number } | null>(null);
  const [confirming, setConfirming]       = useState(false);
  const [deleteTarget, setDeleteTarget]   = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting]           = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const d = await getReceptionAppointments({ data: {} });
      setAppts(d as any[]);
    } catch {
      toast.error("Failed to load payment records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [refreshKey]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePaymentRecord({ data: { id: deleteTarget.id, callerRole: user?.role ?? undefined } });
      setAppts((prev) => prev.filter((row) => row.id !== deleteTarget.id));
      toast.success("Payment record deleted from the database");
      setDeleteTarget(null);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to delete payment record");
    } finally {
      setDeleting(false);
    }
  };

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    setConfirming(true);
    try {
      await confirmCashPayment({ data: { id: confirmTarget.id, callerRole: user?.role ?? undefined } });
      // Optimistic UI update — flip status immediately without re-fetch
      setAppts(prev =>
        prev.map(a => a.id === confirmTarget.id ? { ...a, paymentStatus: "paid" } : a)
      );
      toast.success("Cash payment confirmed successfully.");
      setConfirmTarget(null);
    } catch (e: any) {
      toast.error(e.message ?? "Unable to confirm cash payment. Please try again.");
    } finally {
      setConfirming(false);
    }
  };

  const filtered = appts.filter(a =>
    a.fullName.toLowerCase().includes(query.toLowerCase()) ||
    a.phone?.includes(query)
  );

  // Totals recalculate reactively from appts state
  const totalPaid    = appts.filter(a => a.paymentStatus === "paid").reduce((s, a) => s + Number(a.amount), 0);
  const totalPending = appts.filter(a => a.paymentStatus === "pending").reduce((s, a) => s + Number(a.amount), 0);

  return (
    <StaffGuard allowedRoles={["reception", "staff", "cashier"]}>
      <StaffLayout>
        {/* Page header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground font-display flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-primary" /> Payment Records
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Confirm cash payments and track all appointment billing</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)}
            disabled={loading} className="gap-2 rounded-xl">
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="border border-border/60 rounded-2xl shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Total Collected</p>
              <p className="text-3xl font-extrabold text-green-600 font-display">{totalPaid} ETB</p>
            </CardContent>
          </Card>
          <Card className="border border-border/60 rounded-2xl shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Pending</p>
              <p className="text-3xl font-extrabold text-amber-500 font-display">{totalPending} ETB</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search by patient name or phone..."
            className="pl-10 rounded-xl h-11 border-input/60" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading...
          </div>
        ) : (
          <div className="rounded-2xl border border-border/60 overflow-hidden bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-secondary/30 border-b border-border/60 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Payment Status</th>
                    <th className="px-4 py-3">Visit Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filtered.map(a => (
                    <tr key={a.id} className="hover:bg-secondary/10 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{a.fullName}</p>
                        <p className="text-xs text-muted-foreground">{a.phone}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{a.appointmentDate}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {METHOD_LABEL[a.paymentMethod] ?? a.paymentMethod}
                      </td>
                      <td className="px-4 py-3 font-bold text-foreground">{a.amount} ETB</td>
                      <td className="px-4 py-3">
                        <Badge className={cn(
                          "rounded-full border text-xs font-semibold px-2.5",
                          PAY_STYLE[a.paymentStatus] ?? PAY_STYLE.pending
                        )}>
                          {a.paymentStatus === "paid" ? "Paid" :
                           a.paymentStatus === "failed" ? "Failed" : "Pending"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 capitalize text-muted-foreground text-xs">
                        {a.visitStatus?.replace("_", " ")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                        {a.paymentMethod === "cash" && a.paymentStatus === "pending" ? (
                          <Button
                            size="sm"
                            className="h-8 text-xs rounded-lg bg-green-600 hover:bg-green-700 text-white gap-1.5 px-3 shadow-sm"
                            onClick={() => setConfirmTarget({
                              id: a.id,
                              name: a.fullName,
                              amount: a.amount,
                            })}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Confirm Cash
                          </Button>
                        ) : a.paymentStatus === "paid" ? (
                          <span className="text-xs text-green-600 font-semibold flex items-center justify-end gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Paid
                          </span>
                        ) : null}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/5"
                            title="Delete payment record"
                            onClick={() => setDeleteTarget({ id: a.id, name: a.fullName })}
                          >
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

        {/* Confirmation Dialog */}
        {confirmTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5 animate-fade-in">
              {/* Icon + title */}
              <div className="flex items-center gap-3">
                <div className="bg-green-500/10 p-3 rounded-xl text-green-600">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-lg">Confirm Cash Payment</p>
                  <p className="text-xs text-muted-foreground mt-0.5">This action cannot be undone</p>
                </div>
              </div>

              {/* Details */}
              <div className="bg-secondary/30 rounded-xl p-4 space-y-1 text-sm">
                <p><span className="text-muted-foreground">Patient:</span>{" "}
                  <span className="font-semibold text-foreground">{confirmTarget.name}</span></p>
                <p><span className="text-muted-foreground">Amount:</span>{" "}
                  <span className="font-bold text-foreground">{confirmTarget.amount} ETB</span></p>
                <p><span className="text-muted-foreground">Method:</span>{" "}
                  <span className="font-semibold text-foreground">Cash</span></p>
              </div>

              <p className="text-sm text-muted-foreground">
                Confirm that this patient has paid <strong>{confirmTarget.amount} ETB</strong> in cash at the hospital counter?
              </p>

              {/* Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => setConfirmTarget(null)}
                  disabled={confirming}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white gap-2"
                  onClick={handleConfirm}
                  disabled={confirming}
                >
                  {confirming
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Confirming...</>
                    : <><CheckCircle2 className="h-4 w-4" /> Confirm Cash</>
                  }
                </Button>
              </div>
            </div>
          </div>
        )}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
              <p className="font-bold text-foreground text-lg">Delete payment record</p>
              <p className="text-sm text-muted-foreground">
                This permanently deletes the billing record for{" "}
                <span className="font-semibold text-foreground">{deleteTarget.name}</span> from the database.
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
