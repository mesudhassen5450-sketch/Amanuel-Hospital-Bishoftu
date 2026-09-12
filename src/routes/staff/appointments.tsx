import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StaffGuard } from "@/components/staff/StaffGuard";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { useStaffAuth } from "@/lib/staff-auth";
import { getReceptionAppointments, updateVisitStatus, linkAppointmentToPatient, getPatients, sendSmsReminder, deletePaymentRecord } from "@/lib/staff-server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Search, RefreshCcw, Loader2, CalendarDays, Link2, Send, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff/appointments")({
  head: () => ({ meta: [{ title: "Appointments — Dr. Amanuel Hospital" }] }),
  component: AppointmentsPage,
});

const VISIT_STATUSES = ["booked", "checked_in", "waiting", "completed", "cancelled"] as const;

const STATUS_STYLE: Record<string, string> = {
  booked:     "bg-blue-500/10 text-blue-600 border-blue-500/20",
  checked_in: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  waiting:    "bg-amber-500/10 text-amber-600 border-amber-500/20",
  completed:  "bg-green-600/10 text-green-700 border-green-600/20",
  cancelled:  "bg-destructive/10 text-destructive border-destructive/20",
};

const STATUS_LABEL: Record<string, string> = {
  booked: "Booked", checked_in: "Checked In", waiting: "Waiting",
  completed: "Completed", cancelled: "Cancelled",
};

const SMS_STATUS_STYLE: Record<string, string> = {
  pending:      "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400 dark:border-slate-500/30",
  sent:         "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30",
  failed:       "bg-destructive/10 text-destructive border-destructive/20",
  not_required: "bg-muted text-muted-foreground border-muted-foreground/10",
};

const SMS_STATUS_LABEL: Record<string, string> = {
  pending:      "Pending",
  sent:         "Sent",
  failed:       "Failed",
  not_required: "Not Required",
};

function AppointmentsPage() {
  const { user } = useStaffAuth();
  const [appts, setAppts]         = useState<any[]>([]);
  const [patients, setPatients]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [query, setQuery]         = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [linkModal, setLinkModal] = useState<{ apptId: string; search: string } | null>(null);
  const [sendingSmsId, setSendingSmsId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async (date?: string) => {
    setLoading(true);
    try {
      const [a, p] = await Promise.all([
        getReceptionAppointments({ data: { date: date || undefined } }),
        getPatients(),
      ]);
      setAppts(a as any[]);
      setPatients(p as any[]);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(dateFilter); }, [dateFilter, refreshKey]);

  const handleStatus = async (id: string, visitStatus: string) => {
    try {
      await updateVisitStatus({ data: { id, visitStatus, callerRole: user?.role ?? undefined } });
      toast.success(`Status updated to: ${STATUS_LABEL[visitStatus]}`);
      setAppts(prev => prev.map(a => a.id === id ? { ...a, visitStatus } : a));
    } catch (e: any) { toast.error(e.message); }
  };

  const handleSendSms = async (id: string) => {
    setSendingSmsId(id);
    try {
      const res = await sendSmsReminder({ data: { appointmentId: id } });
      if (res && res.success) {
        toast.success(res.message || "SMS reminder sent!");
      } else {
        toast.error(res?.error || "Failed to send SMS reminder.");
      }
      await load(dateFilter);
    } catch (e: any) {
      toast.error(e.message || "Failed to send SMS reminder.");
      await load(dateFilter);
    } finally {
      setSendingSmsId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePaymentRecord({ data: { id: deleteTarget.id, callerRole: user?.role ?? undefined } });
      setAppts((prev) => prev.filter((row) => row.id !== deleteTarget.id));
      toast.success("Appointment deleted from the database");
      setDeleteTarget(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete appointment");
    } finally {
      setDeleting(false);
    }
  };

  const handleLink = async (apptId: string, patientId: number) => {
    try {
      await linkAppointmentToPatient({ data: { appointmentId: apptId, patientId, callerRole: user?.role ?? undefined } });
      toast.success("Appointment linked to patient record.");
      setLinkModal(null);
      load(dateFilter);
    } catch (e: any) { toast.error(e.message); }
  };

  const filtered = appts.filter(a =>
    a.fullName.toLowerCase().includes(query.toLowerCase()) ||
    a.phone?.includes(query) ||
    (a.patientMRN && a.patientMRN.toLowerCase().includes(query.toLowerCase()))
  );

  const matchedPatients = linkModal
    ? patients.filter(p =>
        p.full_name.toLowerCase().includes(linkModal.search.toLowerCase()) ||
        p.mrn.toLowerCase().includes(linkModal.search.toLowerCase()) ||
        p.phone.includes(linkModal.search)
      ).slice(0, 8)
    : [];

  const METHOD_LABEL: Record<string, string> = {
    telebirr: "Telebirr", cbe_birr: "CBE Birr", card: "Card", cash: "Cash",
  };

  return (
    <StaffGuard allowedRoles={["reception", "staff"]}>
      <StaffLayout>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground font-display flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-primary" /> Appointments
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} appointment(s) shown</p>
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
              placeholder="Search by name, phone, MRN..." className="pl-10 rounded-xl h-11 border-input/60" />
          </div>
          <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
            className="rounded-xl h-11 border-input/60 sm:w-44" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading appointments...
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border border-dashed border-border/60 rounded-2xl">
            <CardContent className="py-16 text-center text-muted-foreground">
              <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No appointments found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-2xl border border-border/60 overflow-hidden bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-secondary/30 border-b border-border/60 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Date / Time</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">MRN</th>
                    <th className="px-4 py-3">SMS Reminder</th>
                    <th className="px-4 py-3">Visit Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filtered.map(a => (
                    <tr key={a.id} className="hover:bg-secondary/10 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{a.fullName}</p>
                        <p className="text-xs text-muted-foreground">{a.phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{a.appointmentDate}</p>
                        <p className="text-xs text-muted-foreground">{a.appointmentTime}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs">{METHOD_LABEL[a.paymentMethod] ?? a.paymentMethod}</p>
                        <p className="text-xs text-muted-foreground">{a.amount} ETB</p>
                      </td>
                      <td className="px-4 py-3">
                        {a.patientMRN ? (
                          <Badge variant="outline" className="font-mono text-xs bg-primary/5 border-primary/20 text-primary">
                            {a.patientMRN}
                          </Badge>
                        ) : (
                          <Button size="sm" variant="ghost"
                            className="h-7 text-xs text-muted-foreground hover:text-primary gap-1 px-2"
                            onClick={() => setLinkModal({ apptId: a.id, search: a.fullName })}>
                            <Link2 className="h-3.5 w-3.5" /> Link
                          </Button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <Badge className={cn("rounded-full border text-xs font-semibold px-2.5", SMS_STATUS_STYLE[a.reminderSmsStatus || "pending"] ?? SMS_STATUS_STYLE.pending)}>
                            {SMS_STATUS_LABEL[a.reminderSmsStatus || "pending"] ?? a.reminderSmsStatus}
                          </Badge>
                          {a.reminderSmsStatus === "sent" && a.reminderSmsSentAt && (
                            <span className="text-[10px] text-muted-foreground mt-0.5">
                              {new Date(a.reminderSmsSentAt).toLocaleDateString()} {new Date(a.reminderSmsSentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {a.reminderSmsStatus === "failed" && a.reminderSmsError && (
                            <span className="text-[10px] text-destructive max-w-[150px] truncate block mt-0.5" title={a.reminderSmsError}>
                              {a.reminderSmsError}
                            </span>
                          )}
                          {a.visitStatus !== "cancelled" && a.reminderSmsStatus !== "sent" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[10px] px-2 rounded-lg mt-1 border-primary/30 text-primary hover:bg-primary/5 gap-1"
                              onClick={() => handleSendSms(a.id)}
                              disabled={sendingSmsId === a.id}
                            >
                              {sendingSmsId === a.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Send className="h-3 w-3" />
                              )}
                              Send Test
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={cn("rounded-full border text-xs font-semibold px-2.5", STATUS_STYLE[a.visitStatus] ?? STATUS_STYLE.booked)}>
                          {STATUS_LABEL[a.visitStatus] ?? a.visitStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {a.visitStatus === "booked" && (
                            <Button size="sm" className="h-7 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5"
                              onClick={() => handleStatus(a.id, "checked_in")}>Check In</Button>
                          )}
                          {a.visitStatus === "checked_in" && (
                            <Button size="sm" className="h-7 text-xs rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-2.5"
                              onClick={() => handleStatus(a.id, "waiting")}>Mark Waiting</Button>
                          )}
                          {(a.visitStatus === "waiting" || a.visitStatus === "checked_in") && (
                            <Button size="sm" className="h-7 text-xs rounded-lg bg-green-600 hover:bg-green-700 text-white px-2.5"
                              onClick={() => handleStatus(a.id, "completed")}>Complete</Button>
                          )}
                          {a.visitStatus !== "cancelled" && a.visitStatus !== "completed" && (
                            <Button size="sm" variant="outline"
                              className="h-7 text-xs rounded-lg border-destructive/30 text-destructive hover:bg-destructive/5 px-2.5"
                              onClick={() => handleStatus(a.id, "cancelled")}>Cancel</Button>
                          )}
                          <Button size="sm" variant="outline"
                            className="h-7 w-7 p-0 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/5"
                            title="Delete appointment"
                            onClick={() => setDeleteTarget(a)}>
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

        {/* Link Patient Modal */}
        {linkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <Card className="w-full max-w-md rounded-2xl shadow-2xl border border-border">
              <CardContent className="p-6 space-y-4">
                <h2 className="font-bold text-lg text-foreground">Link to Patient Record</h2>
                <Input
                  value={linkModal.search}
                  onChange={e => setLinkModal(m => m ? { ...m, search: e.target.value } : null)}
                  placeholder="Search by name, MRN, or phone"
                  className="rounded-xl h-11"
                />
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {matchedPatients.length === 0
                    ? <p className="text-sm text-muted-foreground text-center py-4">No patients found</p>
                    : matchedPatients.map(p => (
                      <div key={p.id} className="flex items-center justify-between bg-secondary/30 rounded-xl px-3 py-2">
                        <div>
                          <p className="text-sm font-semibold">{p.full_name}</p>
                          <p className="text-xs text-muted-foreground">{p.mrn} · {p.phone}</p>
                        </div>
                        <Button size="sm" className="h-7 text-xs rounded-lg"
                          onClick={() => handleLink(linkModal.apptId, p.id)}>Link</Button>
                      </div>
                    ))
                  }
                </div>
                <Button variant="outline" className="w-full rounded-xl" onClick={() => setLinkModal(null)}>Cancel</Button>
              </CardContent>
            </Card>
          </div>
        )}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
              <p className="font-bold text-foreground text-lg">Delete appointment</p>
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
