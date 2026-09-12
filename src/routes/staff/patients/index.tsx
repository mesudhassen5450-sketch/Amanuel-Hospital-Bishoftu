import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StaffGuard } from "@/components/staff/StaffGuard";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { useStaffAuth } from "@/lib/staff-auth";
import { getPatients, deletePatientRecord } from "@/lib/staff-server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, UserPlus, Loader2, Users, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/staff/patients/")({
  head: () => ({ meta: [{ title: "Patients — Dr. Amanuel Hospital" }] }),
  component: PatientsPage,
});

function PatientsPage() {
  const { user } = useStaffAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [query, setQuery]       = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getPatients().then(data => { setPatients(data as any[]); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = patients.filter(p =>
    p.full_name.toLowerCase().includes(query.toLowerCase()) ||
    p.mrn.toLowerCase().includes(query.toLowerCase()) ||
    p.phone.includes(query)
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePatientRecord({ data: { id: deleteTarget.id, callerRole: user?.role ?? undefined } });
      setPatients((prev) => prev.filter((row) => row.id !== deleteTarget.id));
      toast.success("Patient record deleted from the database");
      setDeleteTarget(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete patient");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <StaffGuard allowedRoles={["reception", "staff", "cashier", "doctor", "laboratory", "pharmacy", "admin"]}>
      <StaffLayout>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground font-display flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" /> Patient List
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{patients.length} patients registered</p>
          </div>
          <Link to="/staff/patients/new">
            <Button className="gap-2 rounded-xl shadow-sm">
              <UserPlus className="h-4 w-4" /> Register Patient
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, MRN, or phone..."
            className="pl-10 rounded-xl h-11 border-input/60"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading patients...
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border border-dashed border-border/60 rounded-2xl">
            <CardContent className="py-16 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No patients found</p>
              <p className="text-xs mt-1">Try a different search or register a new patient</p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-2xl border border-border/60 overflow-hidden bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-secondary/30 border-b border-border/60 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                    <th className="px-4 py-3">MRN</th>
                    <th className="px-4 py-3">Full Name</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Gender</th>
                    <th className="px-4 py-3">Date of Birth</th>
                    <th className="px-4 py-3">Registered</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filtered.map(p => (
                    <tr key={p.id} className="hover:bg-secondary/10 transition-colors">
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="font-mono text-xs bg-primary/5 border-primary/20 text-primary">
                          {p.mrn}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">{p.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.phone}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.gender ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.date_of_birth ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link to="/staff/patients/$mrn" params={{ mrn: p.mrn }}>
                            <Button size="sm" variant="outline" className="gap-1.5 rounded-lg h-8 text-xs border-primary/30 text-primary hover:bg-primary/5">
                              <Eye className="h-3.5 w-3.5" /> View
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/5"
                            title="Delete patient"
                            onClick={() => setDeleteTarget(p)}
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
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
              <p className="font-bold text-foreground text-lg">Delete patient</p>
              <p className="text-sm text-muted-foreground">
                This permanently deletes <span className="font-semibold text-foreground">{deleteTarget.full_name}</span> ({deleteTarget.mrn}) and related appointments, lab, and billing records from the database.
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
