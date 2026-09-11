import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Video, Clock, CheckCircle, XCircle, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { PatientRequestModal } from "./PatientRequestModal";
import { useDoctorsPresence } from "@/lib/useDoctorPresence";

interface AvailableDoctorsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AvailableDoctorsModal({ open, onOpenChange }: AvailableDoctorsModalProps) {
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [patientRequestOpen, setPatientRequestOpen] = useState(false);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);
  const { doctors: doctorsList, onlineDoctors, loading } = useDoctorsPresence();

  // Use only live database doctors
  const displayedDoctors = doctorsList;

  const handleCheckAvailability = (doctor: any) => {
    if (!doctor.isOnline) {
      setShowOfflineMessage(true);
      return;
    }
    setSelectedDoctor(doctor);
    setPatientRequestOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display font-bold flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Available Doctors for Instant Video Consultation
          </DialogTitle>
          <DialogDescription>
            Select a doctor below to check availability and start a video consultation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-slate-500 animate-pulse">Checking online doctors...</p>
            </div>
          ) : displayedDoctors.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-slate-500 text-sm">No doctors are currently available.</p>
              <p className="text-xs text-slate-400 mt-1">Please schedule an appointment or check back shortly.</p>
            </div>
          ) : (
            displayedDoctors.map((doctor: any) => (
            <Card key={doctor.id} className="border-border hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">Dr. {doctor.name}</h3>
                      <Badge
                        className={cn(
                          "text-xs",
                          doctor.isOnline
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                        )}
                      >
                        {doctor.isOnline ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
                            Online
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-slate-400 mr-1.5" />
                            Offline
                          </>
                        )}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{doctor.specialty}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {doctor.consultationFee != null ? `Video Call (${doctor.consultationFee} ETB)` : "Video Call (100 ETB)"}
                      </span>
                      <span>⭐ {doctor.rating != null ? doctor.rating.toFixed(1) : "4.9"}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleCheckAvailability(doctor)}
                    disabled={!doctor.isOnline}
                    className={cn(
                      "rounded-xl",
                      doctor.isOnline
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                    )}
                  >
                    {doctor.isOnline ? "Start Video Call" : "Call Unavailable"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
          )}
        </div>

        {showOfflineMessage && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-amber-900 dark:text-amber-100 text-sm">Doctor Offline</h4>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Dr. {selectedDoctor?.name || "This doctor"} is currently offline. You can schedule an appointment for their next available slot or choose an online doctor.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      setShowOfflineMessage(false);
                      window.location.href = "/booking";
                    }}
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    Schedule Appointment
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => setShowOfflineMessage(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Video consultations are available 24/7. Payment required before entering the call.
          </p>
        </div>
      </DialogContent>
      
      <PatientRequestModal 
        open={patientRequestOpen} 
        onOpenChange={setPatientRequestOpen}
        doctor={selectedDoctor}
      />
    </Dialog>
  );
}
