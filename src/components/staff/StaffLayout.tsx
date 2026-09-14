import { type ReactNode, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, CalendarDays, CreditCard, LogOut,
  Stethoscope, Menu, X, Clock, ClipboardList, FlaskConical, TestTube, Pill, CheckCircle2, Package, Shield,
  Sun, Moon,
} from "lucide-react";
import { useStaffAuth } from "@/lib/staff-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme-context";
import { useDoctorCallNotifications } from "@/lib/useDoctorCallNotifications";
import { IncomingCallModal } from "@/components/telemedicine/IncomingCallModal";
import { DoctorAvailabilityModal } from "@/components/telemedicine/DoctorAvailabilityModal";

const RECEPTION_NAV = [
  { to: "/staff/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/staff/patients", label: "Patients", icon: Users },
  { to: "/staff/appointments", label: "Appointments", icon: CalendarDays },
  { to: "/staff/payments", label: "Payments", icon: CreditCard },
];

const ADMIN_NAV = [
  { to: "/staff/admin", label: "Admin Dashboard", icon: LayoutDashboard },
  { to: "/staff/patients", label: "Patients", icon: Users },
  { to: "/staff/appointments", label: "Appointments", icon: CalendarDays },
  { to: "/staff/payments", label: "Payments", icon: CreditCard },
];

const CASHIER_NAV = [
  { to: "/staff/payments", label: "Payments", icon: CreditCard },
  { to: "/staff/appointments", label: "Appointments", icon: CalendarDays },
  { to: "/staff/patients", label: "Patients", icon: Users },
];

const DOCTOR_NAV = [
  { to: "/staff/doctor/dashboard", label: "Doctor Dashboard", icon: LayoutDashboard },
  { to: "/staff/doctor/queue", label: "Waiting Patients", icon: Clock },
  { to: "/staff/patients", label: "Patient Records", icon: Users },
  { to: "/staff/doctor/lab-results", label: "Lab Results", icon: TestTube },
];

const LABORATORY_NAV = [
  { to: "/staff/laboratory/dashboard", label: "Lab Dashboard", icon: LayoutDashboard },
  { to: "/staff/laboratory/requests", label: "Lab Requests", icon: FlaskConical },
  { to: "/staff/laboratory/results", label: "Results", icon: TestTube },
];

const PHARMACY_NAV = [
  { to: "/staff/pharmacy/dashboard", label: "Pharmacy", icon: LayoutDashboard },
  { to: "/staff/pharmacy/prescriptions", label: "Prescriptions", icon: Pill },
  { to: "/staff/pharmacy/dispensed", label: "Dispensed", icon: CheckCircle2 },
  { to: "/staff/pharmacy/inventory", label: "Inventory", icon: Package },
];

export function StaffLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useStaffAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const userRole = user?.role ? (user.role as string).toLowerCase() : null;
  const isDoctor   = userRole === "doctor" || user?.username === "doctor";
  const isLab      = userRole === "laboratory";
  const isPharmacy = userRole === "pharmacy";
  const isAdmin    = userRole === "admin";
  const isCashier  = userRole === "cashier";
  const NAV = isAdmin ? ADMIN_NAV : isDoctor ? DOCTOR_NAV : isLab ? LABORATORY_NAV : isPharmacy ? PHARMACY_NAV : isCashier ? CASHIER_NAV : RECEPTION_NAV;
  const portalLabel = isAdmin ? "Admin Portal" : isDoctor ? "Doctor Portal" : isLab ? "Lab Portal" : isPharmacy ? "Pharmacy Portal" : isCashier ? "Cashier Portal" : "Staff Portal";

  // Global doctor call + consultation-request notifications (any staff page)
  const doctorUsername = isDoctor ? (user?.username || "doctor") : "";
  const {
    incomingCall,
    closeIncomingCall,
    availabilityRequest,
    closeAvailabilityRequest,
  } = useDoctorCallNotifications(doctorUsername);

  const handleLogout = async () => {
    await logout();
    toast.info("Logged out.");
    window.location.href = "/staff/login";
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border/60 flex flex-col transition-transform duration-200",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0 lg:static lg:flex"
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-border/60 bg-primary/5">
          <div className="bg-primary/15 p-2 rounded-xl">
            <Stethoscope className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground leading-tight">Dr. Amanuel</p>
            <p className="text-[11px] text-muted-foreground capitalize">
              {portalLabel}
            </p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon }, idx) => {
            const active = location.pathname === to || location.pathname.startsWith(to + "/");
            return (
              <Link
                key={`${to}-${idx}`}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User + logout */}
        <div className="p-4 border-t border-border/60">
          <div className="mb-3 px-3">
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="text-sm font-semibold text-foreground capitalize">{user?.username}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
          <Button
            variant="ghost" size="sm" onClick={handleLogout}
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
          >
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border/60 bg-card flex items-center gap-4 px-4 sm:px-6 sticky top-0 z-30">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full"
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
          <span className="text-xs text-muted-foreground hidden sm:block">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </span>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>

      {/* Global doctor request + incoming call modals */}
      {isDoctor && (
        <>
          <DoctorAvailabilityModal
            open={!!availabilityRequest}
            onOpenChange={(open) => {
              if (!open) closeAvailabilityRequest();
            }}
            appointment={availabilityRequest}
            currentDoctorUsername={user?.username || "doctor"}
          />
          <IncomingCallModal
            open={!!incomingCall}
            onOpenChange={(open) => {
              if (!open) closeIncomingCall();
            }}
            appointment={incomingCall}
            currentDoctorUsername={user?.username || "doctor"}
          />
        </>
      )}
    </div>
  );
}
