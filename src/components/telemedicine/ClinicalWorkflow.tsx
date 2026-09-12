import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Activity, 
  Heart, 
  Thermometer, 
  Scale, 
  FileText, 
  Pill, 
  Plus, 
  Trash2, 
  Save,
  ChevronDown,
  ChevronUp 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ClinicalWorkflowProps {
  appointment: {
    patient_name: string;
    phone?: string | null;
    patient_age?: number | null;
    patient_gender?: string | null;
    primary_complaints?: string | null;
    doctor_name?: string | null;
    consultation_fee?: number | null;
    vitals?: {
      temperature?: string | null;
      blood_pressure?: string | null;
      heart_rate?: string | null;
      weight?: string | null;
    } | null;
    soap_notes?: {
      subjective?: string | null;
      objective?: string | null;
      assessment?: string | null;
      plan?: string | null;
    } | null;
    prescriptions?: Array<{
      id: string;
      medication: string;
      dosage: string;
      frequency: string;
      duration: string;
    }> | null;
    status?: string | null;
  };
  isDoctor?: boolean;
}

export function ClinicalWorkflow({ appointment, isDoctor = false }: ClinicalWorkflowProps) {
  const [expandedSection, setExpandedSection] = useState<string>("patient");
  
  // Clinical Notes State
  const [clinicalNotes, setClinicalNotes] = useState({
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  });

  // Prescription State
  const [prescriptions, setPrescriptions] = useState<Array<{
    id: string;
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>>([]);

  const [newPrescription, setNewPrescription] = useState({
    medication: "",
    dosage: "",
    frequency: "",
    duration: "",
  });

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? "" : section);
  };

  const addPrescription = () => {
    if (newPrescription.medication && newPrescription.dosage) {
      setPrescriptions([
        ...prescriptions,
        {
          id: Date.now().toString(),
          ...newPrescription,
        },
      ]);
      setNewPrescription({ medication: "", dosage: "", frequency: "", duration: "" });
    }
  };

  const removePrescription = (id: string) => {
    setPrescriptions(prescriptions.filter((p) => p.id !== id));
  };

  const handleSave = () => {
    // Mock save handler
    console.log("Saving clinical notes and prescriptions:", { clinicalNotes, prescriptions });
  };

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto">
      
      {/* Patient Summary Section */}
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader 
          className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          onClick={() => toggleSection("patient")}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Patient Summary
            </CardTitle>
            {expandedSection === "patient" ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {expandedSection === "patient" && (
          <CardContent className="pt-0 space-y-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">
              Patient Summary
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="col-span-1 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Name</Label>
                <p className="font-medium text-foreground text-sm sm:text-base">{appointment.patient_name || "—"}</p>
                {appointment.phone && (
                  <p className="text-xs text-muted-foreground">{appointment.phone}</p>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Age</Label>
                <p className="font-medium text-foreground text-sm sm:text-base">
                  {appointment.patient_age != null ? `${appointment.patient_age} years` : "Not specified"}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Gender</Label>
                <p className="font-medium text-foreground text-sm sm:text-base">
                  {appointment.patient_gender || "Not specified"}
                </p>
              </div>
              <div className="col-span-1 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Primary Complaint</Label>
                <p className="font-medium text-foreground text-sm sm:text-base">
                  {appointment.primary_complaints || "Online Video Consultation"}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Doctor</Label>
                <p className="font-medium text-foreground text-xs sm:text-sm">
                  {appointment.doctor_name || "—"}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fee</Label>
                <p className="font-medium text-foreground text-sm sm:text-base">
                  {appointment.consultation_fee != null ? `${appointment.consultation_fee} ETB` : "100 ETB"}
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Vitals Summary</Label>
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                  <Thermometer className="h-4 w-4 text-amber-600" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Temperature</p>
                    <p className="text-xs font-semibold">{appointment.vitals?.temperature || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                  <Activity className="h-4 w-4 text-red-600" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Blood Pressure</p>
                    <p className="text-xs font-semibold">{appointment.vitals?.blood_pressure || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                  <Heart className="h-4 w-4 text-rose-600" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Heart Rate</p>
                    <p className="text-xs font-semibold">{appointment.vitals?.heart_rate || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                  <Scale className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Weight</p>
                    <p className="text-xs font-semibold">{appointment.vitals?.weight || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Clinical Notes Section - DOCTOR ONLY */}
      {isDoctor && (
        <Card className="border border-border bg-card shadow-sm">
          <CardHeader 
            className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            onClick={() => toggleSection("notes")}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Clinical Notes (SOAP)
              </CardTitle>
              {expandedSection === "notes" ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          {expandedSection === "notes" && (
            <CardContent className="pt-0 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Subjective (S)</Label>
                <Textarea
                  placeholder="Patient's reported symptoms..."
                  value={clinicalNotes.subjective}
                  onChange={(e) => setClinicalNotes({ ...clinicalNotes, subjective: e.target.value })}
                  className="min-h-[60px] text-sm resize-none"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Objective (O)</Label>
                <Textarea
                  placeholder="Physical examination findings..."
                  value={clinicalNotes.objective}
                  onChange={(e) => setClinicalNotes({ ...clinicalNotes, objective: e.target.value })}
                  className="min-h-[60px] text-sm resize-none"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Assessment (A)</Label>
                <Textarea
                  placeholder="Diagnosis and clinical impression..."
                  value={clinicalNotes.assessment}
                  onChange={(e) => setClinicalNotes({ ...clinicalNotes, assessment: e.target.value })}
                  className="min-h-[60px] text-sm resize-none"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Plan (P)</Label>
                <Textarea
                  placeholder="Treatment plan and follow-up..."
                  value={clinicalNotes.plan}
                  onChange={(e) => setClinicalNotes({ ...clinicalNotes, plan: e.target.value })}
                  className="min-h-[60px] text-sm resize-none"
                />
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Prescription Builder Section - DOCTOR ONLY */}
      {isDoctor && (
        <Card className="border border-border bg-card shadow-sm">
          <CardHeader 
            className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            onClick={() => toggleSection("prescription")}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Pill className="h-4 w-4 text-primary" />
                Prescription Builder
                {prescriptions.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">{prescriptions.length}</Badge>
                )}
              </CardTitle>
              {expandedSection === "prescription" ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          {expandedSection === "prescription" && (
            <CardContent className="pt-0 space-y-4">
              
              {/* Add Prescription Form */}
              <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="col-span-1 sm:col-span-2">
                    <Label className="text-xs">Medication Name</Label>
                    <Input
                      placeholder="e.g., Amoxicillin"
                      value={newPrescription.medication}
                      onChange={(e) => setNewPrescription({ ...newPrescription, medication: e.target.value })}
                      className="text-sm h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Dosage</Label>
                    <Input
                      placeholder="e.g., 500mg"
                      value={newPrescription.dosage}
                      onChange={(e) => setNewPrescription({ ...newPrescription, dosage: e.target.value })}
                      className="text-sm h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Frequency</Label>
                    <Input
                      placeholder="e.g., 3x daily"
                      value={newPrescription.frequency}
                      onChange={(e) => setNewPrescription({ ...newPrescription, frequency: e.target.value })}
                      className="text-sm h-8"
                    />
                  </div>
                  <div className="col-span-1 sm:col-span-2">
                    <Label className="text-xs">Duration</Label>
                    <Input
                      placeholder="e.g., 7 days"
                      value={newPrescription.duration}
                      onChange={(e) => setNewPrescription({ ...newPrescription, duration: e.target.value })}
                      className="text-sm h-8"
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={addPrescription}
                  className="w-full h-10 sm:h-8 text-xs sm:text-xs gap-1"
                  disabled={!newPrescription.medication || !newPrescription.dosage}
                >
                  <Plus className="h-3 w-3" />
                  Add Medication
                </Button>
              </div>

              {/* Prescriptions List */}
              {prescriptions.length > 0 && (
                <div className="space-y-2">
                  {prescriptions.map((prescription) => (
                    <div
                      key={prescription.id}
                      className="flex items-start gap-2 bg-card border border-border p-2 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {prescription.medication}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {prescription.dosage} · {prescription.frequency} · {prescription.duration}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => removePrescription(prescription.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

            </CardContent>
          )}
        </Card>
      )}

      {/* Submit Action - DOCTOR ONLY */}
      {isDoctor && (
        <Button
          onClick={handleSave}
          className="w-full h-12 text-sm font-semibold rounded-xl shadow-md gap-2"
          disabled={!clinicalNotes.subjective && !clinicalNotes.objective && !clinicalNotes.assessment && !clinicalNotes.plan && prescriptions.length === 0}
        >
          <Save className="h-4 w-4" />
          Save Notes & Complete Appointment
        </Button>
      )}

      {/* Patient Read-Only View - PATIENT ONLY */}
      {!isDoctor && (
        <>
          {/* Read-Only Prescription Summary */}
          {(appointment.prescriptions && appointment.prescriptions.length > 0) && (
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader 
                className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                onClick={() => toggleSection("prescription")}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Pill className="h-4 w-4 text-primary" />
                    Prescription Summary
                    <Badge variant="secondary" className="ml-2 text-xs">{appointment.prescriptions.length}</Badge>
                  </CardTitle>
                  {expandedSection === "prescription" ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
              {expandedSection === "prescription" && (
                <CardContent className="pt-0 space-y-2">
                  {appointment.prescriptions.map((prescription) => (
                    <div
                      key={prescription.id}
                      className="flex items-start gap-2 bg-slate-50 dark:bg-slate-800/50 border border-border p-3 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {prescription.medication}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {prescription.dosage} · {prescription.frequency} · {prescription.duration}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          )}

          {/* Read-Only Doctor Notes - Show after completion */}
          {appointment.status === 'COMPLETED' && appointment.soap_notes && (
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader 
                className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                onClick={() => toggleSection("notes")}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Doctor Notes & Follow-up
                  </CardTitle>
                  {expandedSection === "notes" ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
              {expandedSection === "notes" && (
                <CardContent className="pt-0 space-y-3">
                  {appointment.soap_notes.plan && (
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Follow-up Instructions</Label>
                      <p className="text-sm text-foreground bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                        {appointment.soap_notes.plan}
                      </p>
                    </div>
                  )}
                  {appointment.soap_notes.assessment && (
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Assessment</Label>
                      <p className="text-sm text-foreground bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                        {appointment.soap_notes.assessment}
                      </p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )}
        </>
      )}

    </div>
  );
}
