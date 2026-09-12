import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StaffGuard } from "@/components/staff/StaffGuard";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { useStaffAuth } from "@/lib/staff-auth";
import {
  getPatientWithAppointment,
  getPatientConsultations,
  saveConsultation,
  createLabRequest,
  getLabRequests,
  getPatientLabResults,
  getMedicines,
  savePrescription,
  getPatientPrescriptions,
  deleteConsultation,
  deleteLabResult,
  deletePrescription,
} from "@/lib/staff-server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  User, Phone, Calendar, MapPin, Heart, AlertTriangle, Activity,
  ChevronLeft, Loader2, ClipboardList, Stethoscope, CheckCircle2,
  Clock, FlaskConical, TestTube, Pill, Plus, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff/doctor/patient/$mrn")({
  validateSearch: (s: Record<string, unknown>) => ({
    appointmentId: s.appointmentId ? String(s.appointmentId) : undefined,
  }),
  head: () => ({ meta: [{ title: "Clinical Profile — Dr. Amanuel Hospital" }] }),
  component: DoctorPatientPage,
});

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

const VISIT_STYLE: Record<string, string> = {  booked:     "bg-blue-500/10 text-blue-600 border-blue-500/20",
  checked_in: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  waiting:    "bg-amber-500/10 text-amber-600 border-amber-500/20",
  completed:  "bg-green-600/10 text-green-700 border-green-600/20",
  cancelled:  "bg-destructive/10 text-destructive border-destructive/20",
};

const METHOD_LABEL: Record<string, string> = {
  telebirr: "Telebirr", cbe_birr: "CBE Birr", card: "Card", cash: "Cash",
};


function DoctorPatientPage() {
  const { mrn } = Route.useParams();
  const { appointmentId } = Route.useSearch();
  const { user } = useStaffAuth();
  const navigate = useNavigate();

  const [patient, setPatient]         = useState<any>(null);
  const [appointment, setAppointment] = useState<any>(null);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [labResults, setLabResults]   = useState<any[]>([]);
  const [labRequests, setLabRequests] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [activeTab, setActiveTab]     = useState<"profile" | "history" | "new" | "lab" | "rx">("profile");

  // Lab request form state
  const LAB_TESTS = [
    "Complete Blood Count (CBC)",
    "Blood Sugar (RBS/FBS)",
    "Urinalysis",
    "Lipid Profile",
    "Liver Function Test (LFT)",
    "Kidney Function Test (KFT)",
    "Malaria Test (RDT/Smear)",
    "Thyroid Panel (TSH/T3/T4)",
    "HIV Screening",
    "Hepatitis B & C",
    "Stool Exam",
    "Sputum AFB (TB Test)",
    "Other",
  ];
  const [labForm, setLabForm]   = useState({ test_name: "", clinical_notes: "" });
  const [labSaving, setLabSaving] = useState(false);

  // ── Prescription state ──────────────────────────────────────────────────────
  const ROUTES_LIST = ["Oral", "IV", "IM", "SC", "Topical", "Inhaled", "Sublingual", "Rectal", "Eye drops", "Ear drops", "Nasal"];
  const FREQ_LIST   = ["Once daily", "Twice daily", "3 times daily", "4 times daily", "Every 6 hours", "Every 8 hours", "Every 12 hours", "As needed (PRN)", "Once weekly", "Stat (single dose)"];
  const DUR_LIST    = ["3 days", "5 days", "7 days", "10 days", "14 days", "1 month", "2 months", "3 months", "Ongoing", "As directed"];

  type RxItem = { medicine_id: number | null; medicine_name_snapshot: string; dosage: string; frequency: string; duration: string; quantity: number; route: string; instructions: string; };
  const emptyItem = (): RxItem => ({ medicine_id: null, medicine_name_snapshot: "", dosage: "", frequency: "", duration: "", quantity: 1, route: "Oral", instructions: "" });

  const [medicines, setMedicines]           = useState<any[]>([]);
  const [prescriptions, setPrescriptions]   = useState<any[]>([]);
  const [deleteTarget, setDeleteTarget]     = useState<{ type: "consultation" | "lab" | "prescription"; row: any } | null>(null);
  const [deleting, setDeleting]             = useState(false);
  const [rxItems, setRxItems]               = useState<RxItem[]>([emptyItem()]);
  const [rxNotes, setRxNotes]               = useState("");
  const [rxSaved, setRxSaved]               = useState(false);
  const [rxSaving, setRxSaving]             = useState(false);
  const [rxMedSearch, setRxMedSearch]       = useState<string[]>([""]);

  // Consultation form state
  const [form, setForm] = useState({
    chief_complaint: "",
    history_of_present_illness: "",
    blood_pressure: "",
    temperature: "",
    pulse_rate: "",
    weight: "",
    height: "",
    physical_examination: "",
    diagnosis: "",
    treatment_plan: "",
    additional_notes: "",
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const p = await getPatientWithAppointment({
          data: { mrn, appointmentId },
        }) as any;
        setPatient(p.patient);
        setAppointment(p.appointment);
        if (p.patient?.id) {
          const [c, lr, lreq] = await Promise.all([
            getPatientConsultations({ data: { patientId: p.patient.id } }),
            getPatientLabResults({ data: { patientId: p.patient.id } }),
            getLabRequests({ data: { patientId: p.patient.id } }),
          ]);
          setConsultations(c as any[]);
          setLabResults(lr as any[]);
          setLabRequests(lreq as any[]);
          // Load prescriptions + medicines list
          const [rx, meds] = await Promise.all([
            getPatientPrescriptions({ data: { patientId: p.patient.id } }),
            getMedicines(),
          ]);
          setPrescriptions(rx as any[]);
          setMedicines(meds as any[]);
        }
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [mrn, appointmentId]);

  const handleLabRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labForm.test_name) { toast.error("Please select a test."); return; }
    setLabSaving(true);
    try {
      await createLabRequest({
        data: {
          patient_id:      patient.id,
          appointment_id:  appointment?.id ?? null,
          doctor_username: user?.username ?? "doctor",
          test_name:       labForm.test_name,
          clinical_notes:  labForm.clinical_notes || undefined,
          callerRole:      user?.role ?? undefined,
        },
      });
      toast.success(`Lab request for "${labForm.test_name}" submitted to laboratory.`);
      setLabForm({ test_name: "", clinical_notes: "" });
      // Refresh pending requests + completed results
      const [lreq, lr] = await Promise.all([
        getLabRequests({ data: { patientId: patient.id } }),
        getPatientLabResults({ data: { patientId: patient.id } }),
      ]);
      setLabRequests(lreq as any[]);
      setLabResults(lr as any[]);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to submit lab request.");
    } finally {
      setLabSaving(false);
    }
  };

  // ── Prescription item helpers ──────────────────────────────────────────────
  const updateRxItem = (idx: number, field: keyof RxItem, value: any) => {
    setRxItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };
  const updateRxSearch = (idx: number, val: string) => {
    setRxMedSearch(prev => prev.map((s, i) => i === idx ? val : s));
    // If user types, clear the medicine_id so they must pick from filtered list
    updateRxItem(idx, "medicine_name_snapshot", val);
    updateRxItem(idx, "medicine_id", null);
  };
  const selectMedicine = (idx: number, med: any) => {
    setRxMedSearch(prev => prev.map((s, i) => i === idx ? med.name : s));
    updateRxItem(idx, "medicine_id", med.id);
    updateRxItem(idx, "medicine_name_snapshot", med.name);
  };
  const addRxItem = () => {
    setRxItems(prev => [...prev, emptyItem()]);
    setRxMedSearch(prev => [...prev, ""]);
  };
  const removeRxItem = (idx: number) => {
    if (rxItems.length === 1) return;
    setRxItems(prev => prev.filter((_, i) => i !== idx));
    setRxMedSearch(prev => prev.filter((_, i) => i !== idx));
  };

  const handleRxSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rxSaved) { toast.error("Prescription already saved for this session."); return; }
    for (const item of rxItems) {
      if (!item.medicine_name_snapshot.trim()) { toast.error("Select a medicine from the list for each row."); return; }
      if (!item.medicine_id) { toast.error(`Please select "${item.medicine_name_snapshot}" from the dropdown list — do not just type the name.`); return; }
      if (!item.dosage.trim())    { toast.error(`Enter dosage for ${item.medicine_name_snapshot}.`); return; }
      if (!item.frequency.trim()) { toast.error(`Enter frequency for ${item.medicine_name_snapshot}.`); return; }
      if (!item.duration.trim())  { toast.error(`Enter duration for ${item.medicine_name_snapshot}.`); return; }
      if (item.quantity < 1)      { toast.error(`Quantity must be ≥ 1 for ${item.medicine_name_snapshot}.`); return; }
    }
    setRxSaving(true);
    try {
      const latestConsultation = consultations[0] ?? null;
      await savePrescription({
        data: {
          patient_id:      patient.id,
          appointment_id:  appointment?.id ?? null,
          consultation_id: latestConsultation?.id ?? null,
          doctor_username: user?.username ?? "doctor",
          notes:           rxNotes || undefined,
          items:           rxItems,
          callerRole:      user?.role ?? undefined,
        },
      });
      toast.success("Prescription saved successfully.");
      setRxSaved(true);
      const updated = await getPatientPrescriptions({ data: { patientId: patient.id } });
      setPrescriptions(updated as any[]);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save prescription.");
    } finally {
      setRxSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === "consultation") {
        await deleteConsultation({ data: { id: deleteTarget.row.id, callerRole: user?.role ?? undefined } });
        setConsultations((prev) => prev.filter((row) => row.id !== deleteTarget.row.id));
        toast.success("Consultation deleted from the database");
      } else if (deleteTarget.type === "lab") {
        await deleteLabResult({ data: { id: deleteTarget.row.id, callerRole: user?.role ?? undefined } });
        setLabResults((prev) => prev.filter((row) => row.id !== deleteTarget.row.id));
        toast.success("Lab result deleted from the database");
      } else {
        await deletePrescription({ data: { id: deleteTarget.row.id, callerRole: user?.role ?? undefined } });
        setPrescriptions((prev) => prev.filter((row) => row.id !== deleteTarget.row.id));
        toast.success("Prescription deleted from the database");
      }
      setDeleteTarget(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete record");
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.chief_complaint.trim()) { toast.error("Chief complaint is required."); return; }
    if (!form.diagnosis.trim())       { toast.error("Diagnosis is required."); return; }
    if (saved) { toast.error("Consultation already saved for this session."); return; }

    setSaving(true);
    try {
      await saveConsultation({
        data: {
          patient_id:                patient.id,
          appointment_id:            appointment?.id ?? null,
          doctor_username:           user?.username ?? "doctor",
          chief_complaint:           form.chief_complaint.trim(),
          history_of_present_illness: form.history_of_present_illness || undefined,
          blood_pressure:            form.blood_pressure || undefined,
          temperature:               form.temperature || undefined,
          pulse_rate:                form.pulse_rate || undefined,
          weight:                    form.weight || undefined,
          height:                    form.height || undefined,
          physical_examination:      form.physical_examination || undefined,
          diagnosis:                 form.diagnosis.trim(),
          treatment_plan:            form.treatment_plan || undefined,
          additional_notes:          form.additional_notes || undefined,
          callerRole:                user?.role ?? undefined,
        },
      });
      toast.success("Consultation saved. Appointment marked as Completed.");
      setSaved(true);
      // Refresh consultations
      const c = await getPatientConsultations({ data: { patientId: patient.id } });
      setConsultations(c as any[]);
      setActiveTab("history");
      if (appointment) setAppointment({ ...appointment, visit_status: "completed" });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save consultation.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <StaffGuard><StaffLayout>
      <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading patient...
      </div>
    </StaffLayout></StaffGuard>
  );

  if (!patient) return (
    <StaffGuard><StaffLayout>
      <div className="text-center py-20 text-muted-foreground">
        <p className="text-lg font-semibold">Patient not found</p>
        <Link to="/staff/doctor/queue">
          <Button variant="outline" className="mt-4 rounded-xl">Back to Queue</Button>
        </Link>
      </div>
    </StaffLayout></StaffGuard>
  );

  return (
    <StaffGuard>
      <StaffLayout>
        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Link to="/staff/doctor/queue" className="text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-extrabold text-foreground font-display">{patient.full_name}</h1>
                <Badge className="font-mono text-xs bg-primary/10 text-primary border-primary/20 border">{patient.mrn}</Badge>
                {appointment && (
                  <Badge className={cn("rounded-full border text-xs font-semibold px-2.5",
                    VISIT_STYLE[appointment.visit_status] ?? VISIT_STYLE.booked)}>
                    {appointment.visit_status?.replace("_", " ")}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {patient.gender ?? "—"} · {patient.date_of_birth ?? "—"} · {patient.phone}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/40 rounded-2xl p-1 mb-6 flex-wrap w-fit">
          {([
            { key: "profile", label: "Patient Info",                       icon: User },
            { key: "history", label: `History (${consultations.length})`,  icon: ClipboardList },
            { key: "new",     label: "New Consultation",                    icon: Stethoscope },
            { key: "lab",     label: `Laboratory (${labResults.length})`,   icon: FlaskConical },
            { key: "rx",      label: `Prescriptions (${prescriptions.length})`, icon: Pill },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                activeTab === key
                  ? "bg-card shadow-sm text-foreground border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── PROFILE TAB ─────────────────────────────────────────────────── */}
        {activeTab === "profile" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-5xl">
            <Card className="lg:col-span-2 border border-border/60 rounded-2xl shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <InfoRow icon={User}     label="Full Name"     value={patient.full_name} />
                <InfoRow icon={Phone}    label="Phone"         value={patient.phone} />
                <InfoRow icon={Calendar} label="Date of Birth" value={patient.date_of_birth} />
                <InfoRow icon={User}     label="Gender"        value={patient.gender} />
                <div className="sm:col-span-2">
                  <InfoRow icon={MapPin} label="Address" value={patient.address} />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/60 rounded-2xl shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> Medical Info
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <InfoRow icon={Heart}         label="Blood Group"        value={patient.blood_group} />
                <InfoRow icon={AlertTriangle} label="Allergies"          value={patient.allergies} />
                <InfoRow icon={Activity}      label="Chronic Conditions" value={patient.chronic_conditions} />
              </CardContent>
            </Card>

            {appointment && (
              <Card className="lg:col-span-3 border border-border/60 rounded-2xl shadow-sm">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" /> Appointment Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5 grid grid-cols-2 sm:grid-cols-2 gap-5">
                  <InfoRow icon={Calendar} label="Date"         value={appointment.appointment_date} />
                  <InfoRow icon={Clock}    label="Time"         value={appointment.appointment_time} />
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── HISTORY TAB ─────────────────────────────────────────────────── */}
        {activeTab === "history" && (
          <div className="max-w-4xl space-y-4">
            {consultations.length === 0 ? (
              <Card className="border border-dashed border-border/60 rounded-2xl">
                <CardContent className="py-16 text-center text-muted-foreground">
                  <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No previous consultation records.</p>
                  <p className="text-xs mt-1">Create a new consultation from the tab above.</p>
                </CardContent>
              </Card>
            ) : consultations.map(c => (
              <Card key={c.id} className="border border-border/60 rounded-2xl shadow-sm">
                <CardHeader className="pb-3 border-b border-border/40">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-primary" />
                      {new Date(c.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground capitalize">Dr. {c.doctor_username}</span>
                      <Button size="sm" variant="outline"
                        className="h-7 w-7 p-0 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/5"
                        title="Delete consultation"
                        onClick={() => setDeleteTarget({ type: "consultation", row: c })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Chief Complaint</p>
                    <p className="text-foreground">{c.chief_complaint}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Diagnosis</p>
                    <p className="text-foreground font-medium">{c.diagnosis}</p>
                  </div>
                  {c.history_of_present_illness && (
                    <div className="sm:col-span-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">History of Present Illness</p>
                      <p className="text-foreground">{c.history_of_present_illness}</p>
                    </div>
                  )}
                  {(c.blood_pressure || c.temperature || c.pulse_rate || c.weight || c.height) && (
                    <div className="sm:col-span-2 bg-secondary/20 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {[
                        ["BP", c.blood_pressure], ["Temp", c.temperature],
                        ["Pulse", c.pulse_rate], ["Weight", c.weight], ["Height", c.height],
                      ].filter(([, v]) => v).map(([label, val]) => (
                        <div key={label as string}>
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="text-sm font-semibold">{val}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {c.treatment_plan && (
                    <div className="sm:col-span-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Treatment Plan</p>
                      <p className="text-foreground">{c.treatment_plan}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ── NEW CONSULTATION TAB ─────────────────────────────────────────── */}
        {activeTab === "new" && (
          <form onSubmit={handleSave} className="max-w-3xl space-y-5">
            {saved && (
              <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 text-green-700 px-4 py-3 rounded-xl text-sm">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                Consultation saved successfully. Appointment marked as Completed.
              </div>
            )}

            {/* Chief Complaint + HPI */}
            <Card className="border border-border/60 rounded-2xl shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-base font-semibold">Presenting Complaint</CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div className="space-y-2">
                  <Label className="font-semibold text-sm">
                    Chief Complaint <span className="text-destructive">*</span>
                  </Label>
                  <Input value={form.chief_complaint} onChange={e => set("chief_complaint", e.target.value)}
                    placeholder="e.g. Chest pain for 2 days" className="rounded-xl h-11" disabled={saved} />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-sm">History of Present Illness / Symptoms</Label>
                  <Textarea value={form.history_of_present_illness}
                    onChange={e => set("history_of_present_illness", e.target.value)}
                    placeholder="Detailed description of symptoms, onset, duration, aggravating/relieving factors..."
                    rows={3} className="rounded-xl resize-none" disabled={saved} />
                </div>
              </CardContent>
            </Card>

            {/* Vital Signs */}
            <Card className="border border-border/60 rounded-2xl shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-base font-semibold">Vital Signs</CardTitle>
              </CardHeader>
              <CardContent className="pt-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { key: "blood_pressure", label: "Blood Pressure", placeholder: "e.g. 120/80 mmHg" },
                  { key: "temperature",    label: "Temperature",    placeholder: "e.g. 37.2 °C" },
                  { key: "pulse_rate",     label: "Pulse Rate",     placeholder: "e.g. 72 bpm" },
                  { key: "weight",         label: "Weight",         placeholder: "e.g. 68 kg" },
                  { key: "height",         label: "Height",         placeholder: "e.g. 170 cm" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} className="space-y-2">
                    <Label className="font-semibold text-sm">{label}</Label>
                    <Input value={(form as any)[key]} onChange={e => set(key, e.target.value)}
                      placeholder={placeholder} className="rounded-xl h-11" disabled={saved} />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Examination + Diagnosis */}
            <Card className="border border-border/60 rounded-2xl shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-base font-semibold">Examination & Diagnosis</CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div className="space-y-2">
                  <Label className="font-semibold text-sm">Physical Examination</Label>
                  <Textarea value={form.physical_examination}
                    onChange={e => set("physical_examination", e.target.value)}
                    placeholder="Findings from physical examination..." rows={3}
                    className="rounded-xl resize-none" disabled={saved} />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-sm">
                    Diagnosis <span className="text-destructive">*</span>
                  </Label>
                  <Textarea value={form.diagnosis} onChange={e => set("diagnosis", e.target.value)}
                    placeholder="Clinical diagnosis..." rows={2}
                    className="rounded-xl resize-none" disabled={saved} />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-sm">Treatment Plan</Label>
                  <Textarea value={form.treatment_plan} onChange={e => set("treatment_plan", e.target.value)}
                    placeholder="Medications, follow-up, referrals..." rows={3}
                    className="rounded-xl resize-none" disabled={saved} />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-sm">Additional Clinical Notes</Label>
                  <Textarea value={form.additional_notes} onChange={e => set("additional_notes", e.target.value)}
                    placeholder="Any other clinical observations..." rows={2}
                    className="rounded-xl resize-none" disabled={saved} />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3 pb-6">
              <Button type="button" variant="outline" className="rounded-xl px-6"
                onClick={() => navigate({ to: "/staff/doctor/queue" })}>
                Back to Queue
              </Button>
              <Button type="submit" disabled={saving || saved} className="rounded-xl px-8 gap-2 shadow-md">
                {saving
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                  : saved
                    ? <><CheckCircle2 className="h-4 w-4" /> Saved</>
                    : <><Stethoscope className="h-4 w-4" /> Save Consultation</>
                }
              </Button>
            </div>
          </form>
        )}

        {/* ── LAB TAB ──────────────────────────────────────────────────────── */}
        {activeTab === "lab" && (
          <div className="max-w-4xl space-y-6">
            {/* Request new test */}
            <Card className="border border-border/60 rounded-2xl shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-primary" /> Request Laboratory Test
                </CardTitle>
              </CardHeader>
              <form onSubmit={handleLabRequest}>
                <CardContent className="pt-5 space-y-4">
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm">
                      Test Name <span className="text-destructive">*</span>
                    </Label>
                    <select
                      value={labForm.test_name}
                      onChange={e => setLabForm(f => ({ ...f, test_name: e.target.value }))}
                      className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select a test...</option>
                      {LAB_TESTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm">Clinical Notes</Label>
                    <Textarea
                      value={labForm.clinical_notes}
                      onChange={e => setLabForm(f => ({ ...f, clinical_notes: e.target.value }))}
                      placeholder="Reason for test, relevant symptoms, urgency..."
                      rows={2} className="rounded-xl resize-none"
                    />
                  </div>
                  <Button type="submit" disabled={labSaving} className="gap-2 rounded-xl">
                    {labSaving
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
                      : <><FlaskConical className="h-4 w-4" /> Submit Lab Request</>
                    }
                  </Button>
                </CardContent>
              </form>
            </Card>

            {/* Pending lab requests for this patient */}
            <div>
              <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-primary" />
                Pending Lab Requests
              </h3>
              {labRequests.filter((r) => r.status === "Requested" || r.status === "In Progress").length === 0 ? (
                <Card className="border border-dashed border-border/60 rounded-2xl mb-6">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <p className="text-sm font-medium">No pending lab requests.</p>
                    <p className="text-xs mt-1">Submit a test above — it will appear here for the laboratory team.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2 mb-6">
                  {labRequests
                    .filter((r) => r.status === "Requested" || r.status === "In Progress")
                    .map((r: any) => (
                      <Card key={r.id} className="border border-border/60 rounded-2xl shadow-sm">
                        <CardContent className="p-4 flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">{r.testName}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Requested by Dr. {r.doctorUsername || "—"} ·{" "}
                              {r.createdAt
                                ? new Date(r.createdAt).toLocaleString()
                                : "—"}
                            </p>
                            {r.clinicalNotes ? (
                              <p className="text-xs text-muted-foreground mt-1">{r.clinicalNotes}</p>
                            ) : null}
                          </div>
                          <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 border rounded-full text-xs font-semibold px-2.5">
                            {r.status}
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </div>

            {/* Lab results for this patient */}
            <div>
              <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                <TestTube className="h-4 w-4 text-primary" />
                Lab Results for This Patient
              </h3>
              {labResults.length === 0 ? (
                <Card className="border border-dashed border-border/60 rounded-2xl">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <TestTube className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">No laboratory results yet.</p>
                    <p className="text-xs mt-1">Results will appear here once the lab team completes the tests.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {labResults.map((r: any) => (
                    <Card key={r.id} className="border border-border/60 rounded-2xl shadow-sm">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                          <div>
                            <p className="font-bold text-foreground">{r.lab_requests?.test_name ?? "Unknown Test"}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Requested by Dr. {r.lab_requests?.doctor_username ?? "—"} ·{" "}
                              {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-600/10 text-green-700 border-green-600/20 border rounded-full text-xs font-semibold px-2.5">
                              Completed
                            </Badge>
                            <Button size="sm" variant="outline"
                              className="h-7 w-7 p-0 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/5"
                              title="Delete lab result"
                              onClick={() => setDeleteTarget({ type: "lab", row: r })}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-secondary/20 rounded-xl p-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Result</p>
                            <p className="text-sm font-bold text-foreground">{r.result_value} {r.unit}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Reference</p>
                            <p className="text-sm font-medium">{r.reference_range}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Unit</p>
                            <p className="text-sm font-medium">{r.unit}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Technician</p>
                            <p className="text-sm font-medium capitalize">{r.technician_id}</p>
                          </div>
                          {r.notes && (
                            <div className="col-span-2 sm:col-span-4">
                              <p className="text-xs text-muted-foreground">Notes</p>
                              <p className="text-sm">{r.notes}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {/* ── RX TAB ───────────────────────────────────────────────────────── */}
        {activeTab === "rx" && (
          <div className="max-w-4xl space-y-6">

            {/* ── New Prescription Form ─── */}
            <Card className="border border-border/60 rounded-2xl shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Pill className="h-4 w-4 text-primary" /> New Prescription
                </CardTitle>
              </CardHeader>
              <form onSubmit={handleRxSave}>
                <CardContent className="pt-5 space-y-5">
                  {rxSaved && (
                    <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 text-green-700 px-4 py-3 rounded-xl text-sm">
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                      Prescription saved successfully.
                    </div>
                  )}

                  {/* Medicine rows */}
                  {rxItems.map((item, idx) => {
                    const filtered = rxMedSearch[idx]
                      ? medicines.filter(m => m.name.toLowerCase().includes(rxMedSearch[idx].toLowerCase())).slice(0, 8)
                      : [];
                    const isSelected = item.medicine_id !== null;

                    return (
                      <div key={idx} className="border border-border/50 rounded-2xl p-4 space-y-4 bg-secondary/10 relative">
                        {/* Row header */}
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Medicine {idx + 1}</p>
                          {rxItems.length > 1 && !rxSaved && (
                            <Button type="button" variant="ghost" size="icon"
                              className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10"
                              onClick={() => removeRxItem(idx)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        {/* Medicine search/select */}
                        <div className="space-y-1 relative">
                          <Label className="font-semibold text-sm">
                            Medicine <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            value={rxMedSearch[idx] ?? ""}
                            onChange={e => updateRxSearch(idx, e.target.value)}
                            placeholder="Type to search medicine..."
                            className={cn(
                              "rounded-xl h-11",
                              item.medicine_id ? "border-green-500/50 focus-visible:ring-green-500/30" : ""
                            )}
                            disabled={rxSaved}
                            autoComplete="off"
                          />
                          {!isSelected && filtered.length > 0 && !rxSaved && (
                            <div className="absolute z-10 w-full bg-card border border-border rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
                              {filtered.map(med => (
                                <button
                                  key={med.id}
                                  type="button"
                                  onClick={() => selectMedicine(idx, med)}
                                  className="w-full text-left px-4 py-2.5 hover:bg-secondary/60 transition-colors text-sm"
                                >
                                  <span className="font-medium">{med.name}</span>
                                  <span className="text-xs text-muted-foreground ml-2">· {med.category} · {med.unit}</span>
                                </button>
                              ))}
                            </div>
                          )}
                          {isSelected && (
                            <p className="text-xs text-primary font-medium">✓ {item.medicine_name_snapshot}</p>
                          )}
                        </div>

                        {/* Dosage + Frequency + Duration + Quantity */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="space-y-1">
                            <Label className="font-semibold text-xs">Dosage <span className="text-destructive">*</span></Label>
                            <Input value={item.dosage}
                              onChange={e => updateRxItem(idx, "dosage", e.target.value)}
                              placeholder="e.g. 500 mg" className="rounded-xl h-10 text-sm" disabled={rxSaved} />
                          </div>
                          <div className="space-y-1">
                            <Label className="font-semibold text-xs">Frequency <span className="text-destructive">*</span></Label>
                            <select value={item.frequency}
                              onChange={e => updateRxItem(idx, "frequency", e.target.value)}
                              className="w-full h-10 px-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              disabled={rxSaved}>
                              <option value="">Select...</option>
                              {FREQ_LIST.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label className="font-semibold text-xs">Duration <span className="text-destructive">*</span></Label>
                            <select value={item.duration}
                              onChange={e => updateRxItem(idx, "duration", e.target.value)}
                              className="w-full h-10 px-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              disabled={rxSaved}>
                              <option value="">Select...</option>
                              {DUR_LIST.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label className="font-semibold text-xs">Qty <span className="text-destructive">*</span></Label>
                            <Input type="number" min={1} value={item.quantity}
                              onChange={e => updateRxItem(idx, "quantity", parseInt(e.target.value) || 1)}
                              className="rounded-xl h-10 text-sm" disabled={rxSaved} />
                          </div>
                        </div>

                        {/* Route + Instructions */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="font-semibold text-xs">Route</Label>
                            <select value={item.route}
                              onChange={e => updateRxItem(idx, "route", e.target.value)}
                              className="w-full h-10 px-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              disabled={rxSaved}>
                              {ROUTES_LIST.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label className="font-semibold text-xs">Instructions</Label>
                            <Input value={item.instructions}
                              onChange={e => updateRxItem(idx, "instructions", e.target.value)}
                              placeholder="e.g. Take after meals" className="rounded-xl h-10 text-sm" disabled={rxSaved} />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add medicine button */}
                  {!rxSaved && (
                    <Button type="button" variant="outline" className="gap-2 rounded-xl border-dashed" onClick={addRxItem}>
                      <Plus className="h-4 w-4" /> Add Another Medicine
                    </Button>
                  )}

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm">Prescription Notes</Label>
                    <Textarea value={rxNotes} onChange={e => setRxNotes(e.target.value)}
                      placeholder="General instructions, allergy alerts, follow-up notes..."
                      rows={2} className="rounded-xl resize-none" disabled={rxSaved} />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Doctor: <strong>Dr. {user?.username}</strong> · Patient: <strong>{patient.full_name}</strong> · MRN: <strong>{patient.mrn}</strong>
                  </p>
                </CardContent>
                <div className="flex gap-3 px-6 py-4 border-t border-border/40">
                  <Button type="button" variant="outline" className="rounded-xl"
                    onClick={() => { setRxItems([emptyItem()]); setRxMedSearch([""]); setRxNotes(""); setRxSaved(false); }}
                    disabled={rxSaving}>
                    Reset
                  </Button>
                  <Button type="submit" disabled={rxSaving || rxSaved} className="rounded-xl gap-2 shadow-sm">
                    {rxSaving
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                      : rxSaved
                        ? <><CheckCircle2 className="h-4 w-4" /> Saved</>
                        : <><Pill className="h-4 w-4" /> Save Prescription</>
                    }
                  </Button>
                </div>
              </form>
            </Card>

            {/* ── Prescription History ─── */}
            <div>
              <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                <Pill className="h-4 w-4 text-primary" />
                Prescription History
              </h3>
              {prescriptions.length === 0 ? (
                <Card className="border border-dashed border-border/60 rounded-2xl">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Pill className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">No previous prescriptions.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {prescriptions.map((presc: any) => (
                    <Card key={presc.id} className="border border-border/60 rounded-2xl shadow-sm">
                      <CardHeader className="pb-3 border-b border-border/40">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Pill className="h-4 w-4 text-primary" />
                            {new Date(presc.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground capitalize">Dr. {presc.doctor_username}</span>
                            <Badge className={cn("rounded-full border text-xs font-semibold px-2.5",
                              presc.prescription_status === "Completed"
                                ? "bg-green-500/10 text-green-700 border-green-500/20"
                                : presc.prescription_status === "Cancelled"
                                  ? "bg-destructive/10 text-destructive border-destructive/20"
                                  : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            )}>
                              {presc.prescription_status}
                            </Badge>
                            <Button size="sm" variant="outline"
                              className="h-7 w-7 p-0 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/5"
                              title="Delete prescription"
                              onClick={() => setDeleteTarget({ type: "prescription", row: presc })}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        {/* Medicine items */}
                        <div className="space-y-2">
                          {(presc.prescription_items ?? []).map((item: any, i: number) => (
                            <div key={item.id ?? i} className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs bg-secondary/20 rounded-xl px-4 py-3">
                              <div>
                                <p className="text-muted-foreground mb-0.5">Medicine</p>
                                <p className="font-semibold text-foreground">{item.medicine_name_snapshot}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground mb-0.5">Dosage</p>
                                <p className="font-medium">{item.dosage}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground mb-0.5">Frequency</p>
                                <p className="font-medium">{item.frequency}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground mb-0.5">Duration / Qty</p>
                                <p className="font-medium">{item.duration} · {item.quantity} {item.route}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground mb-0.5">Instructions</p>
                                <p className="font-medium">{item.instructions || "—"}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        {presc.notes && (
                          <p className="text-xs text-muted-foreground mt-3 italic">{presc.notes}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
              <p className="font-bold text-foreground text-lg">Delete record</p>
              <p className="text-sm text-muted-foreground">
                This permanently deletes this {deleteTarget.type === "lab" ? "lab result" : deleteTarget.type} from the database.
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
