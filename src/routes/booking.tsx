import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock, CreditCard, ArrowRight, Sparkles, Loader2, AlertCircle, CheckCircle2, User, Phone, Calendar as CalendarIcon2, BadgeCheck, Stethoscope } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBooking, type BookingData } from "@/lib/booking-context";
import { useLanguage } from "@/lib/language-context";
import { t } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useDoctorsPresence } from "@/lib/useDoctorPresence";
import { NotificationPermissionBanner } from "@/components/NotificationPermissionBanner";

// Payment method mapping: UI value → database value
const PAYMENT_DB_MAP: Record<string, string> = {
  "Telebirr": "telebirr",
  "CBE Birr": "cbe_birr",
  "Card / Other": "card",
  "Cash": "cash",
};

export const Route = createFileRoute("/booking")({
  head: () => ({
    meta: [
      { title: "Book Appointment — Dr. Amanuel Hospital" },
      { name: "description", content: "Schedule an appointment at Dr. Amanuel Hospital. Select date, time, and payment method online." },
    ],
  }),
  component: BookingPage,
});

const timeSlots = [
  "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM"
];

const paymentMethods = [
  { id: "Telebirr", name: "Telebirr", icon: "📱", desc: "Pay instantly via Telebirr (Chapa)" },
  { id: "CBE Birr", name: "CBE Birr", icon: "🏦", desc: "Pay instantly via CBE Birr (Chapa)" },
  { id: "Card / Other", name: "Card / Other Banks", icon: "💳", desc: "Pay via Debit/Credit Cards & other mobile banks (Chapa)" },
  { id: "Cash", name: "Cash", icon: "💵", desc: "Pay in cash at the hospital counter" }
] as const;

// Type for the confirmed booking returned from Supabase
interface ConfirmedAppointment {
  id: string;
  full_name?: string;
  patient_name?: string;
  phone?: string;
  phone_number?: string;
  appointment_date: string;
  appointment_time: string;
  payment_method: string;
  amount: number;
  payment_status: string;
  booking_status: string;
}

function BookingPage() {
  const { setBooking } = useBooking();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const { doctors: doctorsList } = useDoctorsPresence();

  const [form, setForm] = useState({
    fullName: "",
    phoneNumber: "",
  });
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedPayment, setSelectedPayment] = useState<"Telebirr" | "CBE Birr" | "Card / Other" | "Cash" | "">("");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmed, setConfirmed] = useState<ConfirmedAppointment | null>(null);

  const validate = () => {
    const errs: Record<string, string> = {};
    
    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      errs.fullName = "Please enter a valid full name (at least 2 characters).";
    }
    
    const phoneTrim = form.phoneNumber.trim();
    if (!/^[+\d][\d\s-]{6,}$/.test(phoneTrim)) {
      errs.phoneNumber = "Please enter a valid phone number.";
    }
    
    if (!selectedDate) {
      errs.appointmentDate = "Please choose a date for your appointment.";
    }
    
    if (!selectedTime) {
      errs.appointmentTime = "Please select a preferred time slot.";
    }
    
    if (!selectedPayment) {
      errs.paymentMethod = "Please select a payment method.";
    }

    if (!selectedDoctorId) {
      errs.doctor = "Please select a doctor for your appointment.";
    }
    
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !selectedDate || !selectedPayment) return;

    setSubmitError("");
    setLoading(true);

    const dbPaymentMethod = PAYMENT_DB_MAP[selectedPayment];
    const appointmentDate = format(selectedDate, "yyyy-MM-dd");

    // Use live doctor list from database
    const selectedDoctor = doctorsList.find((d) => d.id === selectedDoctorId);
    const doctorIdToPass = selectedDoctor?.id || selectedDoctorId || "doctor";

    try {
      const { data, error } = await supabase
        .from("appointments")
        .insert({
          patient_name: form.fullName.trim(),
          full_name: form.fullName.trim(),
          phone_number: form.phoneNumber.trim(),
          phone: form.phoneNumber.trim(),
          appointment_date: appointmentDate,
          appointment_time: selectedTime,
          payment_method: dbPaymentMethod,
          doctor_id: doctorIdToPass,
          amount: 300,
          consultation_type: "IN_PERSON",
          payment_status: "pending",
          booking_status: "pending",
          status: "PENDING",
          visit_status: "booked",
          call_status: "WAITING_FOR_DOCTOR",
          transaction_reference: null,
          chapa_transaction_id: null,
          note: null,
        })
        .select()
        .single();

      if (error) {
        console.error("Supabase insert error:", error);
        setSubmitError(
          "We could not complete your appointment request. Please check your information and try again."
        );
        setLoading(false);
        return;
      }

      // Also persist in session context for other pages
      const bookingData: BookingData = {
        fullName: form.fullName.trim(),
        phoneNumber: form.phoneNumber.trim(),
        appointmentDate,
        appointmentTime: selectedTime,
        paymentMethod: selectedPayment,
        amount: 300,
        status: "pending",
      };
      setBooking(bookingData);

      setConfirmed(data as ConfirmedAppointment);
    } catch (err: any) {
      console.error("Unexpected booking error:", err);
      setSubmitError(
        "We could not complete your appointment request. Please check your information and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (confirmed) {
    const isCash = confirmed.payment_method === "cash";
    const methodLabel =
      confirmed.payment_method === "telebirr" ? "Telebirr" :
      confirmed.payment_method === "cbe_birr" ? "CBE Birr" :
      confirmed.payment_method === "card" ? "Card / Other Banks" : "Cash";

    return (
      <SiteLayout>
        <PageHero
          breadcrumb={lang === "am" ? "ቀጠሮ ማረጋገጫ" : lang === "or" ? "Mirkaneessa Qaxaree" : "Booking Confirmation"}
          title={lang === "am" ? "ቀጠሮ ተመዝግቧል" : lang === "or" ? "Qaxareen Galmaa'e" : "Appointment Registered"}
          subtitle={lang === "am" ? "ቀጠሮዎ በተሳካ ሁኔታ ተቀብሏል" : lang === "or" ? "Qaxareen keessan milkiin qeebalame" : "Your appointment request has been submitted successfully."}
        />
        <section className="py-12 md:py-20 px-4">
          <div className="mx-auto max-w-2xl">
            <Card className="border border-border bg-card shadow-xl rounded-3xl overflow-hidden animate-fade-in">
              <div className="h-2 bg-gradient-to-r from-primary via-blue-500 to-primary" />
              <CardHeader className="text-center p-6 sm:p-8 border-b border-border/40 bg-primary/5">
                <div className="flex justify-center mb-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <CheckCircle2 className="h-14 w-14 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-2xl sm:text-3xl font-extrabold text-primary font-display">
                  Booking Submitted!
                </CardTitle>
                <CardDescription className="text-muted-foreground text-sm mt-2 max-w-sm mx-auto">
                  Your appointment request has been submitted successfully. Your booking is currently pending payment confirmation.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 sm:p-8 space-y-6">
                {/* Status badges */}
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <Badge variant="outline" className="rounded-full px-4 py-1.5 text-xs font-semibold bg-amber-500/10 text-amber-600 border-amber-500/20">
                    Payment Status: Pending
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-4 py-1.5 text-xs font-semibold bg-amber-500/10 text-amber-600 border-amber-500/20">
                    Booking Status: Pending
                  </Badge>
                </div>

                {/* Appointment details */}
                <div className="rounded-2xl border border-border/60 bg-secondary/20 p-5 space-y-4">
                  <h3 className="font-display text-sm font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
                    <BadgeCheck className="h-4 w-4 text-primary" />
                    Appointment Details
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="bg-background border border-border p-2 rounded-xl text-primary">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Patient Name</p>
                        <p className="font-semibold text-foreground">{confirmed.full_name || confirmed.patient_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-background border border-border p-2 rounded-xl text-primary">
                        <Phone className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Phone Number</p>
                        <p className="font-semibold text-foreground">{confirmed.phone || confirmed.phone_number}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-background border border-border p-2 rounded-xl text-primary">
                        <CalendarIcon2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Appointment Date</p>
                        <p className="font-semibold text-foreground">{confirmed.appointment_date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-background border border-border p-2 rounded-xl text-primary">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Appointment Time</p>
                        <p className="font-semibold text-foreground">{confirmed.appointment_time}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-background border border-border p-2 rounded-xl text-primary">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Payment Method</p>
                        <p className="font-semibold text-foreground">{methodLabel}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-background border border-border p-2 rounded-xl text-primary">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Amount</p>
                        <p className="font-semibold text-foreground">{confirmed.amount} ETB</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment instruction */}
                <div className={cn(
                  "rounded-2xl border p-4 text-sm",
                  isCash
                    ? "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400"
                    : "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400"
                )}>
                  {isCash
                    ? "Your appointment has been registered. Please pay at the hospital cashier."
                    : "Your appointment has been registered. Online payment integration will be completed in the next phase."}
                </div>
              </CardContent>

              <CardFooter className="flex flex-col sm:flex-row gap-3 p-6 sm:p-8 bg-secondary/10 border-t border-border/40">
                <Button
                  variant="outline"
                  className="flex-1 rounded-2xl h-11 border-border/60"
                  onClick={() => {
                    setConfirmed(null);
                    setForm({ fullName: "", phoneNumber: "" });
                    setSelectedDate(undefined);
                    setSelectedTime("");
                    setSelectedPayment("");
                    setErrors({});
                    setSubmitError("");
                  }}
                >
                  Book Another
                </Button>
                <Button asChild className="flex-1 rounded-2xl h-11 shadow-sm">
                  <a href="/">Go to Homepage</a>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <PageHero
        breadcrumb={lang === "am" ? "ቀጠሮ መያዣ" : lang === "or" ? "Qabannoo Qaxaree" : "Booking"}
        title={lang === "am" ? "ቀጠሮ ያስይዙ" : lang === "or" ? "Qaxaree Qabadhu" : "Book an Appointment"}
        subtitle={lang === "am" ? "እባክዎን ከዚህ በታች ያሉትን ዝርዝሮች በመሙላት ቀጠሮዎን ያጠናቅቁ" : lang === "or" ? "Odeeffannoo armaan gadii guutuun qaxaree keessan mirkaneessaa" : "Please fill in the details below to schedule your medical appointment."}
      />

      <div className="pt-6 px-4">
        <div className="mx-auto max-w-4xl">
          <NotificationPermissionBanner userRole="patient" />
        </div>
      </div>

      <section className="py-12 md:py-20 px-4">
        <div className="mx-auto max-w-3xl">
          <Card className="border border-border bg-card shadow-lg rounded-3xl overflow-hidden animate-fade-in">
            <CardHeader className="bg-gradient-to-r from-primary/10 via-transparent to-transparent border-b border-border/40 p-6 sm:p-8">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm tracking-wide uppercase">
                <Sparkles className="h-4 w-4 text-primary animate-pulse-soft" />
                <span>Appointment Booking Form</span>
              </div>
              <CardTitle className="mt-2 text-2xl font-bold font-display">Schedule Your In-Person Visit</CardTitle>
              <CardDescription className="text-muted-foreground text-sm">
                Provide your details, select a date & time, and pick your payment method to secure your in-person hospital visit (300 ETB).
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8" noValidate>
              <CardContent className="space-y-6 p-0">
                
                {/* Full Name & Phone Number */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="book-name" className="text-foreground font-medium">Full Name</Label>
                    <Input
                      id="book-name"
                      disabled={loading}
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      placeholder="e.g. Abebe Kebede"
                      className={cn(
                        "rounded-xl h-11 border-input/60 focus-visible:ring-primary",
                        errors.fullName && "border-destructive focus-visible:ring-destructive"
                      )}
                      aria-invalid={!!errors.fullName}
                    />
                    {errors.fullName && (
                      <p className="text-xs text-destructive flex items-center gap-1 font-medium">{errors.fullName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="book-phone" className="text-foreground font-medium">Phone Number</Label>
                    <Input
                      id="book-phone"
                      type="tel"
                      disabled={loading}
                      value={form.phoneNumber}
                      onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                      placeholder="e.g. +251 911 223 344"
                      className={cn(
                        "rounded-xl h-11 border-input/60 focus-visible:ring-primary",
                        errors.phoneNumber && "border-destructive focus-visible:ring-destructive"
                      )}
                      aria-invalid={!!errors.phoneNumber}
                    />
                    {errors.phoneNumber && (
                      <p className="text-xs text-destructive flex items-center gap-1 font-medium">{errors.phoneNumber}</p>
                    )}
                  </div>
                </div>

                {/* Doctor Selection */}
                <div className="space-y-2">
                  <Label className="text-foreground font-medium flex items-center gap-1">
                    <Stethoscope className="h-4 w-4 text-primary" />
                    Select Doctor
                  </Label>
                  <Select
                    value={selectedDoctorId}
                    onValueChange={setSelectedDoctorId}
                    disabled={loading}
                  >
                    <SelectTrigger
                      className={cn(
                        "rounded-xl h-11 border-input/60",
                        errors.doctor && "border-destructive"
                      )}
                    >
                      <SelectValue placeholder="Choose a doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctorsList.length === 0 ? (
                        <SelectItem value="general">Hospital Duty Specialist / General Doctor</SelectItem>
                      ) : (
                        doctorsList.map((doctor) => (
                          <SelectItem key={doctor.id} value={doctor.id.toString()}>
                            Dr. {doctor.name.replace(/^Dr\.\s*/, '')} - {doctor.specialty || 'General Practice'}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.doctor && (
                    <p className="text-xs text-destructive flex items-center gap-1 font-medium">{errors.doctor}</p>
                  )}
                </div>

                {/* Calendar Picker (Date) */}
                <div className="space-y-2">
                  <Label className="text-foreground font-medium block">Appointment Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={loading}
                        className={cn(
                          "w-full justify-start text-left font-normal h-11 rounded-xl border-input/60",
                          !selectedDate && "text-muted-foreground",
                          errors.appointmentDate && "border-destructive"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                        {selectedDate ? format(selectedDate, "PPP") : "Choose a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.appointmentDate && (
                    <p className="text-xs text-destructive flex items-center gap-1 font-medium">{errors.appointmentDate}</p>
                  )}
                </div>

                {/* Time Selection */}
                <div className="space-y-2">
                  <Label className="text-foreground font-medium flex items-center gap-1">
                    <Clock className="h-4 w-4 text-primary" />
                    Appointment Time
                  </Label>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                    {timeSlots.map((time) => {
                      const isSelected = selectedTime === time;
                      return (
                        <button
                          key={time}
                          type="button"
                          disabled={loading}
                          onClick={() => setSelectedTime(time)}
                          className={cn(
                            "py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow"
                              : "border-border hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                  {errors.appointmentTime && (
                    <p className="text-xs text-destructive flex items-center gap-1 font-medium">{errors.appointmentTime}</p>
                  )}
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-3">
                  <Label className="text-foreground font-medium flex items-center gap-1">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Payment Method
                  </Label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {paymentMethods.map((pm) => {
                      const isSelected = selectedPayment === pm.id;
                      return (
                        <button
                          key={pm.id}
                          type="button"
                          disabled={loading}
                          onClick={() => setSelectedPayment(pm.id as any)}
                          className={cn(
                            "flex flex-row items-center gap-3 p-4 rounded-2xl border text-left transition-all hover-lift cursor-pointer",
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                              : "border-border hover:border-border/80 hover:bg-secondary/20"
                          )}
                        >
                          <span className="text-2xl">{pm.icon}</span>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-foreground">{pm.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{pm.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {errors.paymentMethod && (
                    <p className="text-xs text-destructive flex items-center gap-1 font-medium">{errors.paymentMethod}</p>
                  )}
                </div>

              </CardContent>

              <CardFooter className="flex flex-col items-stretch p-0 pt-4 border-t border-border/40">
                {submitError && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs font-medium text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}
                <div className="flex items-center justify-between mb-4 text-sm font-semibold">
                  <span className="text-muted-foreground">Consultation Fee</span>
                  <span className="text-foreground text-lg">300 ETB</span>
                </div>
                <Button type="submit" disabled={loading} className="w-full rounded-2xl h-12 text-sm font-semibold flex items-center justify-center gap-2 group shadow-md transition-all">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing your booking...
                    </>
                  ) : (
                    <>
                      {selectedPayment === "Cash" ? "Confirm Appointment" : "Continue to Pay"}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </section>
    </SiteLayout>
  );
}
