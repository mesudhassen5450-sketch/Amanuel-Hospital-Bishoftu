import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StaffGuard } from "@/components/staff/StaffGuard";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { useStaffAuth } from "@/lib/staff-auth";
import { getDoctorStats, getDoctorQueue } from "@/lib/staff-server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Stethoscope, Clock, BadgeCheck, CheckCircle2, Loader2, RefreshCcw, ListChecks, Video, Phone, Wifi, WifiOff, Users } from "lucide-react";
import { DoctorAvailabilityModal } from "@/components/telemedicine/DoctorAvailabilityModal";
import { IncomingCallModal } from "@/components/telemedicine/IncomingCallModal";
import { NotificationPermissionBanner } from "@/components/telemedicine/NotificationPermissionBanner";
import { useDoctorPresence } from "@/lib/useDoctorPresence";
import { useDoctorCallNotifications } from "@/lib/useDoctorCallNotifications";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/staff/doctor/dashboard")({
  head: () => ({ meta: [{ title: "Doctor Dashboard — Dr. Amanuel Hospital" }] }),
  component: DoctorDashboardPage,
});

function DoctorDashboardPage() {
  const { user, hydrated } = useStaffAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);

  // Use username for doctor presence and notifications (must be called before any conditional returns)
  const doctorUsername = user?.username;
  const { availabilityRequest, incomingCall, closeAvailabilityRequest, closeIncomingCall } = useDoctorCallNotifications(doctorUsername || "doctor");

  // Use doctor presence hook with heartbeat (must be called before any conditional returns)
  useDoctorPresence(doctorUsername, isAvailable);

  const load = async () => {
    setLoading(true);
    try { setStats(await getDoctorStats()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Supabase Realtime subscription for general appointments
  useEffect(() => {
    if (!hydrated || !doctorUsername) {
      return;
    }

    const channel = supabase
      .channel(`doctor-dashboard-${doctorUsername}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `doctor_id=eq.${doctorUsername}`,
        },
        (payload) => {
          const newAppointment = payload.new as any;
          
          // Play notification sound
          const audio = new Audio('/notification-sound.wav');
          audio.play().catch(console.error);
          
          // Show toast notification
          toast.success('New Appointment', {
            description: `${newAppointment.full_name || newAppointment.patient_name || 'Patient'} has booked an appointment`,
            duration: 5000,
          });
          
          // Refresh stats
          load();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `doctor_id=eq.${doctorUsername}`,
        },
        (payload) => {
          // Refresh stats when appointments are updated
          load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [doctorUsername]);

  // Prevent execution during initial hydration or when user is null (must be after all hooks)
  if (!hydrated || !user?.username) {
    return (
      <StaffGuard allowedRoles={["doctor", "staff"]}>
        <StaffLayout>
          <div className="flex items-center justify-center h-48 text-slate-500 dark:text-slate-400 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading...
          </div>
        </StaffLayout>
      </StaffGuard>
    );
  }

  const CARDS = stats ? [
    { label: "Today's Patients", value: stats.todayPatients, icon: Users,         color: "text-primary",    bg: "bg-primary/10" },
    { label: "Waiting",          value: stats.waiting,       icon: Clock,          color: "text-amber-500",  bg: "bg-amber-500/10" },
    { label: "Checked In",       value: stats.checkedIn,     icon: BadgeCheck,     color: "text-blue-500",   bg: "bg-blue-500/10" },
    { label: "Completed",        value: stats.completed,     icon: CheckCircle2,   color: "text-green-600",  bg: "bg-green-500/10" },
  ] : [];

  return (
    <StaffGuard allowedRoles={["doctor", "staff"]}>
      <StaffLayout>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-display flex items-center gap-2">
              <Stethoscope className="h-7 w-7 text-primary" /> Doctor Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              Welcome, <span className="font-semibold capitalize text-primary">{user?.username}</span> ·{" "}
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              {isAvailable ? (
                <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <WifiOff className="h-4 w-4 text-slate-400" />
              )}
              <Switch
                checked={isAvailable}
                onCheckedChange={setIsAvailable}
                className="data-[state=checked]:bg-green-600"
              />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {isAvailable ? "Available" : "Away"}
              </span>
            </div>
            <NotificationPermissionBanner userId={doctorUsername} userRole="doctor" compact />
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2 rounded-xl">
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>

        <NotificationPermissionBanner userId={doctorUsername} userRole="doctor" className="mb-6" />

        {loading ? (
          <div className="flex items-center justify-center h-48 text-slate-500 dark:text-slate-400 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading...
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            {CARDS.map(({ label, value, icon: Icon, color, bg }) => (
              <Card key={label} className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-2xl">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{label}</p>
                    <p className={`text-3xl font-extrabold font-display ${color}`}>{value}</p>
                  </div>
                  <div className={`${bg} ${color} p-3 rounded-xl`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          <Link to="/staff/doctor/queue">
            <Card className="border border-slate-200 dark:border-slate-800 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/30 transition-colors cursor-pointer rounded-2xl">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="bg-amber-500/15 p-3 rounded-xl text-amber-600 dark:text-amber-400">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Patient Queue</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Waiting & checked-in patients</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/staff/patients">
            <Card className="border border-slate-200 dark:border-slate-800 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors cursor-pointer rounded-2xl">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="bg-blue-500/15 p-3 rounded-xl text-blue-600 dark:text-blue-400">
                  <ListChecks className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Patient Records</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Search all patients by MRN</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <DoctorAvailabilityModal
          open={!!availabilityRequest}
          onOpenChange={closeAvailabilityRequest}
          appointment={availabilityRequest}
          currentDoctorUsername={doctorUsername || "doctor"}
        />

        <IncomingCallModal
          open={!!incomingCall}
          onOpenChange={(open) => {
            if (!open) closeIncomingCall();
          }}
          appointment={incomingCall}
          currentDoctorUsername={doctorUsername || "doctor"}
        />
      </StaffLayout>
    </StaffGuard>
  );
}
