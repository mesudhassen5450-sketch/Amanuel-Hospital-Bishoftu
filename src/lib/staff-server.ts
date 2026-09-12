import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { normalizeStaffRole } from "@/lib/staff-roles";

function getSupabase() {
  const url = process.env["VITE_SUPABASE_URL"]
    ?? (typeof import.meta !== "undefined" ? (import.meta as any).env?.["VITE_SUPABASE_URL"] : undefined)
    ?? process.env["SUPABASE_URL"];
  const key = process.env["VITE_SUPABASE_ANON_KEY"]
    ?? (typeof import.meta !== "undefined" ? (import.meta as any).env?.["VITE_SUPABASE_ANON_KEY"] : undefined)
    ?? process.env["SUPABASE_ANON_KEY"];
  if (!url || !key) throw new Error("Supabase env vars not set on server.");
  return createClient(url, key);
}

// ── Helper functions for data normalization ────────────────────────────────────
function normaliseMethod(method: string | null): string {
  if (!method) return "Unknown";
  return method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
}

function normaliseStatus(bookingStatus: string | null, paymentStatus: string | null): string {
  if (paymentStatus === "paid") return "Confirmed";
  if (bookingStatus === "confirmed") return "Confirmed";
  if (bookingStatus === "pending") return "Pending";
  return "Unknown";
}

// ── Server-side role authorization ────────────────────────────────────────────
// callerRole is sent from the client session — validated here server-side.
// This prevents cross-role API abuse even if a user bypasses the frontend guard.
const ROLE_PERMISSIONS: Record<string, string[]> = {
  // reception/staff manage patients and appointments
  registerPatient:          ["reception", "staff", "admin"],
  updatePatient:            ["reception", "staff", "admin"],
  confirmCashPayment:       ["reception", "cashier", "staff", "admin"],
  deletePaymentRecord:      ["reception", "cashier", "staff", "admin", "doctor", "laboratory", "pharmacy"],
  deletePatientRecord:      ["reception", "cashier", "staff", "admin", "doctor", "laboratory", "pharmacy"],
  deletePrescription:       ["pharmacy", "staff", "admin", "doctor"],
  deleteConsultation:       ["doctor", "staff", "admin", "reception"],
  updateVisitStatus:        ["reception", "staff", "doctor", "admin"],
  linkAppointmentToPatient: ["reception", "staff", "admin"],
  getDashboardStats:        ["reception", "staff", "admin"],
  sendSmsReminder:          ["reception", "staff", "admin"],
  sendAutomatedReminders:   ["reception", "staff", "admin"],
  // doctor manages clinical data
  getDoctorQueue:           ["doctor", "staff", "admin"],
  getDoctorStats:           ["doctor", "staff", "admin"],
  getPatientConsultations:  ["doctor", "staff", "admin"],
  saveConsultation:         ["doctor", "staff", "admin"],
  createLabRequest:         ["doctor", "staff", "admin"],
  savePrescription:         ["doctor", "staff", "admin"],
  getPatientPrescriptions:  ["doctor", "pharmacy", "staff", "admin"],
  // laboratory manages lab results
  getLabDashboardStats:     ["laboratory", "staff", "admin"],
  getLabRequests:           ["laboratory", "staff", "admin"],
  updateLabRequestStatus:   ["laboratory", "staff", "admin"],
  saveLabResult:            ["laboratory", "staff", "admin"],
  deleteLabRequest:         ["laboratory", "staff", "admin", "doctor"],
  deleteLabResult:          ["laboratory", "staff", "admin", "doctor"],
  getPatientLabResults:     ["laboratory", "doctor", "staff", "admin"],
  getAllLabResults:         ["laboratory", "doctor", "staff", "admin"],
  // pharmacy manages dispensing
  getMedicines:             ["pharmacy", "doctor", "staff", "admin"],
  getPharmacyStats:         ["pharmacy", "staff", "admin"],
  getPrescriptionsForPharmacy: ["pharmacy", "staff", "admin"],
  getMedicinesWithStock:    ["pharmacy", "staff", "admin"],
  dispensePrescription:     ["pharmacy", "staff", "admin"],
  // admin manages staff accounts
  getAllStaffAccounts:      ["admin"],
  getStaffAccountById:      ["admin"],
  createStaffAccount:       ["admin"],
  updateStaffAccount:       ["admin"],
  resetStaffPassword:       ["admin"],
  toggleStaffStatus:        ["admin"],
  deleteStaffAccount:       ["admin"],
  updateDoctorOnlineStatus: ["doctor", "admin"],
};

function checkRole(fnName: string, callerRole?: string): void {
  const allowed = ROLE_PERMISSIONS[fnName];
  if (!allowed) return;
  const role = normalizeStaffRole(callerRole);
  if (!role) throw new Error(`Unauthorized access: authentication required for ${fnName}.`);
  if (!allowed.includes(role)) {
    throw new Error(`Unauthorized access: role '${callerRole}' cannot perform '${fnName}'. Allowed: ${allowed.join(", ")}.`);
  }
}

async function deletePrescriptionCascade(sb: ReturnType<typeof getSupabase>, rxIds: number[]) {
  if (!rxIds.length) return;
  const { data: items } = await sb.from("prescription_items").select("id").in("prescription_id", rxIds);
  const itemIds = (items ?? []).map((row: any) => row.id);
  if (itemIds.length) {
    await sb.from("dispense_log").delete().in("prescription_item_id", itemIds);
    await sb.from("prescription_items").delete().in("id", itemIds);
  }
  await sb.from("prescriptions").delete().in("id", rxIds);
}

async function deleteAppointmentCascade(sb: ReturnType<typeof getSupabase>, apptId: string) {
  const { data: labs } = await sb.from("lab_requests").select("id").eq("appointment_id", apptId);
  const labIds = (labs ?? []).map((row: any) => row.id);
  if (labIds.length) {
    await sb.from("lab_results").delete().in("lab_request_id", labIds);
    await sb.from("lab_requests").delete().in("id", labIds);
  }

  await sb.from("messages").delete().eq("appointment_id", apptId);
  await sb.from("consultation_notes").delete().eq("appointment_id", apptId);
  await sb.from("consultations").delete().eq("appointment_id", apptId);

  const { data: rx } = await sb.from("prescriptions").select("id").eq("appointment_id", apptId);
  await deletePrescriptionCascade(sb, (rx ?? []).map((row: any) => row.id));

  const { error } = await sb.from("appointments").delete().eq("id", apptId);
  if (error) throw new Error(error.message);
}

// ── MRN generation ────────────────────────────────────────────────────────────
export const generateMRN = createServerFn({ method: "POST" })
  .handler(async () => {
    const sb = getSupabase();
    const { data, error } = await sb.rpc("generate_mrn");
    if (error) throw new Error(error.message);
    return data as string;
  });

// ── Register patient ──────────────────────────────────────────────────────────
export const registerPatient = createServerFn({ method: "POST" })
  .validator((d: {
    full_name: string; phone: string; date_of_birth?: string; gender?: string;
    address?: string; emergency_contact_name?: string; emergency_contact_phone?: string;
    blood_group?: string; allergies?: string; chronic_conditions?: string; notes?: string;
    callerRole?: string;
  }) => d)
  .handler(async ({ data }) => {
    checkRole("registerPatient", data.callerRole);
    const sb = getSupabase();
    // Generate MRN first
    const { data: mrn, error: mrnErr } = await sb.rpc("generate_mrn");
    if (mrnErr) throw new Error(mrnErr.message);

    const now = new Date().toISOString();
    const { data: patient, error } = await sb
      .from("patients")
      .insert({ ...data, mrn, created_at: now, updated_at: now })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return patient;
  });

// ── Update patient ────────────────────────────────────────────────────────────
export const updatePatient = createServerFn({ method: "POST" })
  .validator((d: { id: number; callerRole?: string; [key: string]: any }) => d)
  .handler(async ({ data }) => {
    checkRole("updatePatient", data.callerRole);
    const sb = getSupabase();
    const { id, callerRole: _cr, ...rest } = data;
    const { error } = await sb
      .from("patients")
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  });

export const deletePatientRecord = createServerFn({ method: "POST" })
  .validator((d: { id: number; callerRole?: string }) => d)
  .handler(async ({ data }) => {
    checkRole("deletePatientRecord", data.callerRole);
    const sb = getSupabase();
    const patientId = data.id;

    const { data: appts } = await sb.from("appointments").select("id").eq("patient_id", patientId);
    for (const appt of appts ?? []) {
      await deleteAppointmentCascade(sb, String(appt.id));
    }

    const { data: labs } = await sb.from("lab_requests").select("id").eq("patient_id", patientId);
    const labIds = (labs ?? []).map((row: any) => row.id);
    if (labIds.length) {
      await sb.from("lab_results").delete().in("lab_request_id", labIds);
      await sb.from("lab_requests").delete().in("id", labIds);
    }
    await sb.from("lab_results").delete().eq("patient_id", patientId);

    const { data: rx } = await sb.from("prescriptions").select("id").eq("patient_id", patientId);
    await deletePrescriptionCascade(sb, (rx ?? []).map((row: any) => row.id));

    await sb.from("consultations").delete().eq("patient_id", patientId);

    const { error } = await sb.from("patients").delete().eq("id", patientId);
    if (error) throw new Error(error.message);
    return true;
  });

export const getPatients = createServerFn({ method: "POST" })
  .handler(async () => {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("patients")
      .select("id,mrn,full_name,phone,gender,date_of_birth,created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ── Get single patient by MRN ─────────────────────────────────────────────────
export const getPatientByMRN = createServerFn({ method: "POST" })
  .validator((d: { mrn: string }) => d)
  .handler(async ({ data }) => {
    const sb = getSupabase();
    const { data: patient, error } = await sb
      .from("patients")
      .select("*")
      .eq("mrn", data.mrn)
      .single();
    if (error) throw new Error(error.message);
    return patient;
  });

// ── Get appointments for reception ───────────────────────────────────────────
export const getReceptionAppointments = createServerFn({ method: "POST" })
  .validator((d: { date?: string }) => d)
  .handler(async ({ data }) => {
    const sb = getSupabase();
    let q = sb
      .from("appointments")
      .select("*, patients(id,mrn,full_name)")
      .order("appointment_date", { ascending: false })
      .order("appointment_time", { ascending: true });    if (data.date) q = q.eq("appointment_date", data.date);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    // Normalise field names so admin.tsx UI works unchanged
    return (rows ?? []).map((r: any) => ({
      id: String(r.id),
      fullName: r.full_name || r.patient_name,
      phone: r.phone || r.phone_number || "",
      phoneNumber: r.phone || r.phone_number,
      appointmentDate: r.appointment_date,
      appointmentTime: r.appointment_time,
      paymentMethod: String(r.payment_method || "").toLowerCase(),
      amount: r.amount,
      status: normaliseStatus(r.booking_status, r.payment_status),
      txRef: r.transaction_reference ?? undefined,
      paymentStatus: r.payment_status,
      visitStatus: r.visit_status,
      patientMRN: r.patients?.mrn,
      createdAt: r.created_at,
      reminderSmsStatus: r.reminder_sms_status,
      reminderSmsError: r.reminder_sms_error,
    }));
  });

// ── Update visit status ───────────────────────────────────────────────────────
export const updateVisitStatus = createServerFn({ method: "POST" })
  .validator((d: { id: string; visitStatus: string; callerRole?: string }) => d)
  .handler(async ({ data }) => {
    checkRole("updateVisitStatus", data.callerRole);
    const sb = getSupabase();
    const now = new Date().toISOString();
    const updatePayload: any = { visit_status: data.visitStatus, updated_at: now };
    if (data.visitStatus === "cancelled") {
      updatePayload.reminder_sms_status = "not_required";
    }

    const { error } = await sb
      .from("appointments")
      .update(updatePayload)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return true;
  });

// ── Link appointment to patient ───────────────────────────────────────────────
export const linkAppointmentToPatient = createServerFn({ method: "POST" })
  .validator((d: { appointmentId: string; patientId: number; callerRole?: string }) => d)
  .handler(async ({ data }) => {
    checkRole("linkAppointmentToPatient", data.callerRole);
    const sb = getSupabase();
    const { error } = await sb
      .from("appointments")
      .update({ patient_id: data.patientId, updated_at: new Date().toISOString() })
      .eq("id", data.appointmentId);
    if (error) throw new Error(error.message);
    return true;
  });

// ── Dashboard stats ───────────────────────────────────────────────────────────
export const getDashboardStats = createServerFn({ method: "POST" })
  .handler(async () => {
    const sb = getSupabase();
    const today = new Date().toISOString().split("T")[0];

    const [apptRes, patientsRes] = await Promise.all([
      sb.from("appointments").select("id,visit_status,payment_status,booking_status,patient_id,created_at")
        .eq("appointment_date", today),
      sb.from("patients").select("id,created_at").gte("created_at", today + "T00:00:00Z"),
    ]);

    const appts = apptRes.data ?? [];
    const patients = patientsRes.data ?? [];

    return {
      todayAppointments: appts.length,
      todayRegistered:   patients.length,
      waiting:           appts.filter((a: any) => a.visit_status === "waiting").length,
      checkedIn:         appts.filter((a: any) => a.visit_status === "checked_in").length,
      completed:         appts.filter((a: any) => a.visit_status === "completed").length,
      pendingPayment:    appts.filter((a: any) => a.payment_status === "pending").length,
      paidPayment:       appts.filter((a: any) => a.payment_status === "paid").length,
    };
  });

// ── Doctor: get patient queue (waiting + checked_in) ─────────────────────────
export const getDoctorQueue = createServerFn({ method: "POST" })
  .validator((d: { date?: string }) => d)
  .handler(async ({ data }) => {
    const sb = getSupabase();
    let q = sb
      .from("appointments")
      .select("*, patients(id,mrn,full_name,phone,gender,date_of_birth,blood_group,allergies,chronic_conditions)")
      .in("visit_status", ["waiting", "checked_in", "completed"])
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true });
    if (data.date) q = q.eq("appointment_date", data.date);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => ({
      id:              String(r.id),
      fullName:        r.full_name || r.patient_name,
      phone:           r.phone || r.phone_number,
      appointmentDate: r.appointment_date,
      appointmentTime: r.appointment_time,
      paymentMethod:   r.payment_method,
      paymentStatus:   r.payment_status,
      visitStatus:     r.visit_status ?? "booked",
      patientId:       r.patient_id ?? null,
      patientMRN:      r.patients?.mrn ?? null,
      patient:         r.patients ?? null,
      createdAt:       r.created_at,
    }));
  });

// ── Doctor: dashboard stats ───────────────────────────────────────────────────
export const getDoctorStats = createServerFn({ method: "POST" })
  .handler(async () => {
    const sb = getSupabase();
    const today = new Date().toISOString().split("T")[0];
    const { data: appts, error } = await sb
      .from("appointments")
      .select("id,visit_status")
      .eq("appointment_date", today);
    if (error) throw new Error(error.message);
    const rows = appts ?? [];
    return {
      todayPatients: rows.length,
      waiting:       rows.filter((a: any) => a.visit_status === "waiting").length,
      checkedIn:     rows.filter((a: any) => a.visit_status === "checked_in").length,
      completed:     rows.filter((a: any) => a.visit_status === "completed").length,
    };
  });

// ── Get full patient + latest appointment by MRN ──────────────────────────────
export const getPatientWithAppointment = createServerFn({ method: "POST" })
  .validator((d: { mrn: string; appointmentId?: string }) => d)
  .handler(async ({ data }) => {
    const sb = getSupabase();
    const { data: patient, error: pErr } = await sb
      .from("patients")
      .select("*")
      .eq("mrn", data.mrn)
      .single();
    if (pErr) throw new Error(pErr.message);

    let appointment = null;

    // 1. Try by explicit appointmentId first
    if (data.appointmentId) {
      const { data: appt } = await sb
        .from("appointments")
        .select("*")
        .eq("id", data.appointmentId)
        .single();
      appointment = appt;
    }

    // 2. Try by patient_id (linked)
    if (!appointment && patient?.id) {
      const { data: appt } = await sb
        .from("appointments")
        .select("*")
        .eq("patient_id", patient.id)
        .order("appointment_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      appointment = appt;
    }

    // 3. Try by full_name + phone (unlinked appointments from public booking)
    if (!appointment && patient) {
      const { data: appt } = await sb
        .from("appointments")
        .select("*")
        .eq("full_name", patient.full_name)
        .eq("phone", patient.phone)
        .order("appointment_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      appointment = appt;
      // Auto-link if found
      if (appt) {
        await sb
          .from("appointments")
          .update({ patient_id: patient.id, updated_at: new Date().toISOString() })
          .eq("id", appt.id);
      }
    }

    return { patient, appointment };
  });

// ── Get consultations for a patient ──────────────────────────────────────────
export const getPatientConsultations = createServerFn({ method: "POST" })
  .validator((d: { patientId: number }) => d)
  .handler(async ({ data }) => {
    const sb = getSupabase();
    const { data: rows, error } = await sb
      .from("consultations")
      .select("*")
      .eq("patient_id", data.patientId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const deleteConsultation = createServerFn({ method: "POST" })
  .validator((d: { id: number; callerRole?: string }) => d)
  .handler(async ({ data }) => {
    checkRole("deleteConsultation", data.callerRole);
    const sb = getSupabase();
    const { error } = await sb.from("consultations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return true;
  });

// ── Save consultation ─────────────────────────────────────────────────────────
export const saveConsultation = createServerFn({ method: "POST" })
  .validator((d: {
    patient_id: number;
    appointment_id?: number | null;
    doctor_username: string;
    chief_complaint: string;
    history_of_present_illness?: string;
    blood_pressure?: string;
    temperature?: string;
    pulse_rate?: string;
    weight?: string;
    height?: string;
    physical_examination?: string;
    diagnosis: string;
    treatment_plan?: string;
    additional_notes?: string;
    callerRole?: string;
  }) => d)
  .handler(async ({ data }) => {
    checkRole("saveConsultation", data.callerRole);
    const sb = getSupabase();
    const now = new Date().toISOString();

    // Insert consultation
    const { data: consult, error: cErr } = await sb
      .from("consultations")
      .insert({ ...data, created_at: now, updated_at: now })
      .select()
      .single();
    if (cErr) throw new Error(cErr.message);

    // Mark appointment as completed
    if (data.appointment_id) {
      await sb
        .from("appointments")
        .update({ visit_status: "completed", updated_at: now })
        .eq("id", data.appointment_id);
    }

    return consult;
  });

// ── Confirm cash payment ──────────────────────────────────────────────────────
export const confirmCashPayment = createServerFn({ method: "POST" })
  .validator((d: { id: string; callerRole?: string }) => d)
  .handler(async ({ data }) => {
    checkRole("confirmCashPayment", data.callerRole);
    const sb = getSupabase();
    // Only confirm if payment_method is cash AND payment_status is pending
    const { data: appt, error: fetchErr } = await sb
      .from("appointments")
      .select("id, payment_method, payment_status")
      .eq("id", data.id)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);
    if (appt.payment_method !== "cash") throw new Error("Only cash payments can be confirmed here.");
    if (appt.payment_status === "paid")  throw new Error("This payment is already confirmed.");

    const { error: updateErr } = await sb
      .from("appointments")
      .update({ payment_status: "paid", updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (updateErr) throw new Error(updateErr.message);
    return true;
  });

export const deletePaymentRecord = createServerFn({ method: "POST" })
  .validator((d: { id: string; callerRole?: string }) => d)
  .handler(async ({ data }) => {
    checkRole("deletePaymentRecord", data.callerRole);
    await deleteAppointmentCascade(getSupabase(), data.id);
    return true;
  });

export const deletePrescription = createServerFn({ method: "POST" })
  .validator((d: { id: number; callerRole?: string }) => d)
  .handler(async ({ data }) => {
    checkRole("deletePrescription", data.callerRole);
    await deletePrescriptionCascade(getSupabase(), [data.id]);
    return true;
  });

// ── SMS: normalize Ethiopian phone number to E.164 (+2519XXXXXXXX) ────────────
function normalizeEthiopianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Already full international: 2519XXXXXXXX
  if (digits.startsWith("251") && digits.length === 12) return "+" + digits;
  // Local 09XXXXXXXX or 07XXXXXXXX
  if ((digits.startsWith("09") || digits.startsWith("07")) && digits.length === 10) {
    return "+251" + digits.slice(1);
  }
  // 9XXXXXXXX (9 digits, missing leading 0)
  if ((digits.startsWith("9") || digits.startsWith("7")) && digits.length === 9) {
    return "+251" + digits;
  }
  // Already has +
  if (phone.startsWith("+")) return phone;
  return "+" + digits;
}

// ── SMS: send one reminder via AfroMessage ────────────────────────────────────
export const sendSmsReminder = createServerFn({ method: "POST" })
  .validator((d: { appointmentId: string }) => d)
  .handler(async ({ data }) => {
    const sb = getSupabase();
    const now = new Date().toISOString();

    // 1. Fetch appointment
    const { data: appt, error: apptErr } = await sb
      .from("appointments")
      .select("id, full_name, phone, appointment_date, appointment_time, booking_status, reminder_sms_sent, reminder_sms_status")
      .eq("id", data.appointmentId)
      .single();
    if (apptErr) {
      return { success: false, error: "Appointment not found: " + apptErr.message };
    }

    // 2. Eligibility checks
    if (appt.booking_status === "cancelled") {
      await sb.from("appointments").update({
        reminder_sms_status: "not_required",
        updated_at: now,
      }).eq("id", data.appointmentId);
      return { success: false, error: "Appointment is cancelled. SMS not required." };
    }
    if (appt.reminder_sms_sent === true) {
      return { success: false, error: "Reminder already sent for this appointment." };
    }

    // 3. Read token SERVER-SIDE only — never reaches the browser
    const token = process.env["AFROMESSAGE_API_TOKEN"];
    const identifierId = process.env["AFROMESSAGE_IDENTIFIER_ID"] ?? "";
    if (!token || token === "your_afromessage_api_token_here") {
      // Mark as failed with a safe message
      await sb.from("appointments").update({
        reminder_sms_status: "failed",
        reminder_sms_error: "SMS provider not configured. Add AFROMESSAGE_API_TOKEN.",
        updated_at: now,
      }).eq("id", data.appointmentId);
      return { success: false, error: "SMS provider not configured. Please add AFROMESSAGE_API_TOKEN to environment variables." };
    }

    // 4. Build message
    const patientName = appt.full_name ?? "Patient";
    const apptDate    = appt.appointment_date ?? "";
    const apptTime    = appt.appointment_time ?? "";
    const message = `Dear ${patientName}, this is a reminder from Dr. Amanuel Hospital. You have an appointment scheduled for ${apptDate} at ${apptTime}. Please arrive on time. Thank you.`;

    // 5. Normalize phone
    const toPhone = normalizeEthiopianPhone(appt.phone ?? "");

    // 6. Call AfroMessage API (server-side only)
    let smsSuccess = false;
    let smsError   = "";
    try {
      const body: Record<string, string> = {
        to:      toPhone,
        message: message,
      };
      // Map the identifier to 'sender' or 'from' depending on its format
      if (identifierId && identifierId !== "your_identifier_id_here") {
        if (identifierId.length < 15 || /^\d+$/.test(identifierId)) {
          body["sender"] = identifierId;
        } else {
          body["from"] = identifierId;
        }
      }

      const response = await fetch("https://api.afromessage.com/api/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type":  "application/json",
          "Accept":        "application/json",
        },
        body: JSON.stringify(body),
      });

      let responseText = "";
      try {
        responseText = await response.text();
      } catch (e) {
        responseText = "Could not read response body";
      }

      let result: any = null;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        // Not JSON
      }

      if (response.ok && (result?.acknowledge === "success" || result?.status === "success" || result?.code === "success" || response.status === 200)) {
        smsSuccess = true;
      } else {
        let extractedError = "";
        if (result) {
          extractedError = result?.response?.errors?.[0]
            ?? result?.message
            ?? result?.error
            ?? result?.description
            ?? "";
        }
        
        if (!extractedError && responseText) {
          if (responseText.includes("<html") || responseText.includes("<HTML")) {
            extractedError = `HTTP ${response.status} (HTML Error Page)`;
          } else {
            extractedError = responseText.length > 200 
              ? responseText.substring(0, 200) + "..." 
              : responseText;
          }
        }
        
        smsError = extractedError || `HTTP ${response.status} Error`;

        console.error("AfroMessage API Send Error:", {
          status: response.status,
          statusText: response.statusText,
          responseText: responseText,
          requestBody: { to: toPhone, messageLength: message.length }
        });
      }
    } catch (fetchErr: any) {
      smsError = fetchErr?.message ?? "Network error contacting SMS provider.";
      console.error("Fetch Error in sendSmsReminder:", fetchErr);
    }

    // 7. Persist result
    if (smsSuccess) {
      await sb.from("appointments").update({
        reminder_sms_sent:    true,
        reminder_sms_sent_at: now,
        reminder_sms_status:  "sent",
        reminder_sms_error:   null,
        updated_at:           now,
      }).eq("id", data.appointmentId);
      return { success: true, message: "SMS reminder sent successfully." };
    } else {
      await sb.from("appointments").update({
        reminder_sms_sent:   false,
        reminder_sms_status: "failed",
        reminder_sms_error:  smsError,
        updated_at:          now,
      }).eq("id", data.appointmentId);
      return { success: false, error: smsError };
    }
  });

// ── SMS: send automated reminders for tomorrow ─────────────────────────────────
export const sendAutomatedReminders = createServerFn({ method: "POST" })
  .handler(async () => {
    const sb = getSupabase();
    const now = new Date();
    // Get tomorrow's date string (YYYY-MM-DD) in EAT (UTC+3)
    const eatOffset = 3 * 60 * 60 * 1000;
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000 + eatOffset);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    // Query appointments for tomorrow that haven't been sent yet and are not cancelled
    const { data: appts, error } = await sb
      .from("appointments")
      .select("id")
      .eq("appointment_date", tomorrowStr)
      .neq("booking_status", "cancelled")
      .eq("reminder_sms_sent", false);

    if (error) {
      throw new Error("Failed to fetch appointments: " + error.message);
    }

    const results = [];
    for (const appt of appts ?? []) {
      try {
        const res = await sendSmsReminder({ data: { appointmentId: String(appt.id) } });
        if (res.success) {
          results.push({ id: appt.id, success: true, message: res.message });
        } else {
          results.push({ id: appt.id, success: false, error: res.error });
        }
      } catch (err: any) {
        results.push({ id: appt.id, success: false, error: err.message });
      }
    }

    return {
      dateChecked: tomorrowStr,
      totalFound: appts?.length ?? 0,
      results,
    };
  });

// ════════════════════════════════════════════════════════════
// PHASE 6 — LABORATORY SERVER FUNCTIONS
// ════════════════════════════════════════════════════════════

// ── Lab: dashboard stats ──────────────────────────────────────────────────────
export const getLabDashboardStats = createServerFn({ method: "POST" })
  .handler(async () => {
    const sb = getSupabase();
    const today = new Date().toISOString().split("T")[0];
    const { data: all, error } = await sb
      .from("lab_requests")
      .select("id,status,created_at");
    if (error) throw new Error(error.message);
    const rows = all ?? [];
    const todayRows = rows.filter((r: any) => r.created_at?.startsWith(today));
    return {
      todayRequests: todayRows.length,
      pending:       rows.filter((r: any) => r.status === "Requested").length,
      processing:    rows.filter((r: any) => r.status === "Processing" || r.status === "Sample Collected").length,
      completed:     rows.filter((r: any) => r.status === "Completed").length,
    };
  });

// ── Lab: get all requests ─────────────────────────────────────────────────────
export const getLabRequests = createServerFn({ method: "POST" })
  .validator((d: { status?: string }) => d)
  .handler(async ({ data }) => {
    const sb = getSupabase();
    let q = sb
      .from("lab_requests")
      .select("*, patients(id,mrn,full_name,phone)")
      .order("created_at", { ascending: false });
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => ({
      id:             r.id,
      patientId:      r.patient_id,
      appointmentId:  r.appointment_id,
      doctorUsername: r.doctor_username,
      testName:       r.test_name,
      clinicalNotes:  r.clinical_notes,
      status:         r.status,
      createdAt:      r.created_at,
      patient:        r.patients ?? null,
    }));
  });

// ── Lab: update request status ────────────────────────────────────────────────
export const updateLabRequestStatus = createServerFn({ method: "POST" })
  .validator((d: { id: number; status: string; callerRole?: string }) => d)
  .handler(async ({ data }) => {
    checkRole("updateLabRequestStatus", data.callerRole);
    const sb = getSupabase();
    const { error } = await sb
      .from("lab_requests")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return true;
  });

export const deleteLabRequest = createServerFn({ method: "POST" })
  .validator((d: { id: number; callerRole?: string }) => d)
  .handler(async ({ data }) => {
    checkRole("deleteLabRequest", data.callerRole);
    const sb = getSupabase();
    await sb.from("lab_results").delete().eq("lab_request_id", data.id);
    const { error } = await sb.from("lab_requests").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return true;
  });

export const deleteLabResult = createServerFn({ method: "POST" })
  .validator((d: { id: number; callerRole?: string }) => d)
  .handler(async ({ data }) => {
    checkRole("deleteLabResult", data.callerRole);
    const sb = getSupabase();
    const { error } = await sb.from("lab_results").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return true;
  });
export const saveLabResult = createServerFn({ method: "POST" })
  .validator((d: {
    lab_request_id: number;
    patient_id: number;
    technician_id: string;
    result_value: string;
    reference_range: string;
    unit: string;
    notes?: string;
    callerRole?: string;
  }) => d)
  .handler(async ({ data }) => {
    checkRole("saveLabResult", data.callerRole);
    const sb = getSupabase();
    const now = new Date().toISOString();
    const { data: result, error: rErr } = await sb
      .from("lab_results")
      .insert({ ...data, created_at: now, updated_at: now })
      .select()
      .single();
    if (rErr) throw new Error(rErr.message);
    // Mark request as Completed
    await sb
      .from("lab_requests")
      .update({ status: "Completed", updated_at: now })
      .eq("id", data.lab_request_id);
    return result;
  });

// ── Lab: get results for a patient ────────────────────────────────────────────
export const getPatientLabResults = createServerFn({ method: "POST" })
  .validator((d: { patientId: number }) => d)
  .handler(async ({ data }) => {
    const sb = getSupabase();
    const { data: rows, error } = await sb
      .from("lab_results")
      .select("*, lab_requests(id,test_name,clinical_notes,doctor_username,status,created_at)")
      .eq("patient_id", data.patientId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ── Lab: create request ───────────────────────────────────────────────────────
export const createLabRequest = createServerFn({ method: "POST" })
  .validator((d: {
    patient_id: number;
    appointment_id?: number | null;
    doctor_username: string;
    test_name: string;
    clinical_notes?: string;
    callerRole?: string;
  }) => d)
  .handler(async ({ data }) => {
    checkRole("createLabRequest", data.callerRole);
    const sb = getSupabase();
    const now = new Date().toISOString();
    const { data: req, error } = await sb
      .from("lab_requests")
      .insert({ ...data, status: "Requested", created_at: now, updated_at: now })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return req;
  });

// ── Lab: get all results (for doctor/admin view) ──────────────────────────────
export const getAllLabResults = createServerFn({ method: "POST" })
  .handler(async () => {
    const sb = getSupabase();
    const { data: rows, error } = await sb
      .from("lab_results")
      .select("*, patients(id,mrn,full_name), lab_requests(id,test_name,doctor_username,created_at)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ════════════════════════════════════════════════════════════
// PHASE 7 — PRESCRIPTION SERVER FUNCTIONS
// ════════════════════════════════════════════════════════════

// ── Get active medicines list ─────────────────────────────────────────────────
export const getMedicines = createServerFn({ method: "POST" })
  .handler(async () => {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("medicines")
      .select("id,name,generic_name,category,unit")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ── Save prescription + items atomically ─────────────────────────────────────
export const savePrescription = createServerFn({ method: "POST" })
  .validator((d: {
    patient_id: number;
    appointment_id?: number | null;
    consultation_id?: number | null;
    doctor_username: string;
    notes?: string;
    callerRole?: string;
    items: {
      medicine_id?: number | null;
      medicine_name_snapshot: string;
      dosage: string;
      frequency: string;
      duration: string;
      quantity: number;
      route: string;
      instructions?: string;
    }[];
  }) => d)
  .handler(async ({ data }) => {
    checkRole("savePrescription", data.callerRole);
    const sb = getSupabase();
    const now = new Date().toISOString();

    // Validate patient exists
    const { data: patient, error: pErr } = await sb
      .from("patients")
      .select("id,mrn")
      .eq("id", data.patient_id)
      .single();
    if (pErr || !patient) throw new Error("Patient not found.");

    // Validate items — require medicine_id from medicines table
    if (!data.items || data.items.length === 0)
      throw new Error("Prescription must have at least one medicine.");

    for (const item of data.items) {
      if (!item.medicine_name_snapshot.trim())
        throw new Error("Medicine name is required.");
      if (!item.medicine_id)
        throw new Error(`"${item.medicine_name_snapshot}" was typed manually. Please select it from the medicine list.`);
      // Verify medicine_id exists and is active in the medicines table
      const { data: med, error: medErr } = await sb
        .from("medicines")
        .select("id,name,is_active")
        .eq("id", item.medicine_id)
        .single();
      if (medErr || !med)
        throw new Error(`Medicine ID ${item.medicine_id} not found in the medicines database.`);
      if (!med.is_active)
        throw new Error(`"${med.name}" is inactive and cannot be prescribed.`);
      if (!item.dosage.trim())    throw new Error(`Dosage is required for ${med.name}.`);
      if (!item.frequency.trim()) throw new Error(`Frequency is required for ${med.name}.`);
      if (!item.duration.trim())  throw new Error(`Duration is required for ${med.name}.`);
      if (!item.quantity || item.quantity < 1)
        throw new Error(`Quantity must be at least 1 for ${med.name}.`);
    }

    // Insert prescription
    const { data: presc, error: prescErr } = await sb
      .from("prescriptions")
      .insert({
        patient_id:          data.patient_id,
        appointment_id:      data.appointment_id ?? null,
        consultation_id:     data.consultation_id ?? null,
        doctor_username:     data.doctor_username,
        prescription_status: "Pending",
        notes:               data.notes ?? null,
        created_at:          now,
        updated_at:          now,
      })
      .select()
      .single();
    if (prescErr) throw new Error(prescErr.message);

    // Insert items
    const itemRows = data.items.map(item => ({
      prescription_id:        presc.id,
      medicine_id:            item.medicine_id ?? null,
      medicine_name_snapshot: item.medicine_name_snapshot.trim(),
      dosage:                 item.dosage.trim(),
      frequency:              item.frequency.trim(),
      duration:               item.duration.trim(),
      quantity:               item.quantity,
      route:                  item.route || "Oral",
      instructions:           item.instructions ?? null,
      dispensing_status:      "Pending",
      dispensed_quantity:     0,
      created_at:             now,
      updated_at:             now,
    }));

    const { error: itemsErr } = await sb
      .from("prescription_items")
      .insert(itemRows);
    if (itemsErr) throw new Error(itemsErr.message);

    return presc;
  });

// ── Get prescriptions for a patient ──────────────────────────────────────────
export const getPatientPrescriptions = createServerFn({ method: "POST" })
  .validator((d: { patientId: number }) => d)
  .handler(async ({ data }) => {
    const sb = getSupabase();
    const { data: rows, error } = await sb
      .from("prescriptions")
      .select("*, prescription_items(*)")
      .eq("patient_id", data.patientId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ════════════════════════════════════════════════════════════
// PHASE 7.3 — PHARMACY SERVER FUNCTIONS
// ════════════════════════════════════════════════════════════

// ── Pharmacy: dashboard stats ─────────────────────────────────────────────────
export const getPharmacyStats = createServerFn({ method: "POST" })
  .handler(async () => {
    const sb = getSupabase();
    const { data: prescriptions, error } = await sb
      .from("prescriptions")
      .select("id,prescription_status");
    if (error) throw new Error(error.message);
    const rows = prescriptions ?? [];
    return {
      pending:   rows.filter((r: any) => r.prescription_status === "Pending").length,
      ready:     rows.filter((r: any) => r.prescription_status === "Ready").length,
      completed: rows.filter((r: any) => r.prescription_status === "Completed").length,
      cancelled: rows.filter((r: any) => r.prescription_status === "Cancelled").length,
      total:     rows.length,
    };
  });

// ── Pharmacy: get all prescriptions with patient + items ──────────────────────
export const getPrescriptionsForPharmacy = createServerFn({ method: "POST" })
  .validator((d: { status?: string }) => d)
  .handler(async ({ data }) => {
    const sb = getSupabase();
    let q = sb
      .from("prescriptions")
      .select("*, patients(id,mrn,full_name,phone), prescription_items(*)")
      .order("created_at", { ascending: false });
    if (data.status) q = q.eq("prescription_status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ── Pharmacy: get medicines with stock ───────────────────────────────────────
export const getMedicinesWithStock = createServerFn({ method: "POST" })
  .handler(async () => {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("medicines")
      .select("id,name,generic_name,category,unit,stock_quantity,is_active")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ── Pharmacy: dispense a prescription ────────────────────────────────────────
export const dispensePrescription = createServerFn({ method: "POST" })
  .validator((d: { prescriptionId: number; pharmacistUsername: string; callerRole?: string }) => d)
  .handler(async ({ data }) => {
    checkRole("dispensePrescription", data.callerRole);
    const sb = getSupabase();
    const now = new Date().toISOString();

    // Load prescription with items
    const { data: presc, error: prescErr } = await sb
      .from("prescriptions")
      .select("*, prescription_items(*)")
      .eq("id", data.prescriptionId)
      .single();
    if (prescErr || !presc) throw new Error("Prescription not found.");
    if (presc.prescription_status === "Completed")
      throw new Error("This prescription has already been dispensed.");
    if (presc.prescription_status === "Cancelled")
      throw new Error("Cannot dispense a cancelled prescription.");

    const items = presc.prescription_items ?? [];
    if (items.length === 0) throw new Error("Prescription has no items.");

    // Stock check pass — collect medicine ids that have a medicine_id
    for (const item of items) {
      if (!item.medicine_id) continue; // medicine not linked to inventory
      const { data: med } = await sb
        .from("medicines")
        .select("id,name,stock_quantity")
        .eq("id", item.medicine_id)
        .single();
      if (med && med.stock_quantity < item.quantity) {
        throw new Error(
          `Insufficient stock for ${item.medicine_name_snapshot}. ` +
          `Available: ${med.stock_quantity}, Required: ${item.quantity}.`
        );
      }
    }

    // Deduct stock + write dispense log
    for (const item of items) {
      if (item.medicine_id) {
        const { data: med } = await sb
          .from("medicines")
          .select("stock_quantity")
          .eq("id", item.medicine_id)
          .single();
        if (med) {
          await sb
            .from("medicines")
            .update({ stock_quantity: Math.max(0, med.stock_quantity - item.quantity), updated_at: now })
            .eq("id", item.medicine_id);
        }
      }
      // Write dispense log
      await sb.from("dispense_log").insert({
        prescription_id:      data.prescriptionId,
        prescription_item_id: item.id,
        medicine_id:          item.medicine_id ?? null,
        medicine_name:        item.medicine_name_snapshot,
        quantity_dispensed:   item.quantity,
        pharmacist_username:  data.pharmacistUsername,
        dispensed_at:         now,
      });
      // Mark item as dispensed
      await sb
        .from("prescription_items")
        .update({ dispensing_status: "Dispensed", dispensed_quantity: item.quantity, updated_at: now })
        .eq("id", item.id);
    }

    // Mark prescription as Completed
    await sb
      .from("prescriptions")
      .update({ prescription_status: "Completed", updated_at: now })
      .eq("id", data.prescriptionId);

    return true;
  });

// ════════════════════════════════════════════════════════════
// PHASE 9.1 — SECURE STAFF AUTHENTICATION
// ════════════════════════════════════════════════════════════

// ── Validate staff login via Supabase (never exposes password hash to browser) ─
export const validateStaffLogin = createServerFn({ method: "POST" })
  .validator((d: { username: string; password: string }) => d)
  .handler(async ({ data }) => {
    const sb = getSupabase();

    // Call the SECURITY DEFINER postgres function — never reads staff_accounts directly
    const { data: result, error } = await sb.rpc("validate_staff_login", {
      p_username: data.username.toLowerCase().trim(),
      p_password: data.password,
    });

    if (error) {
      // RPC failed (DB error) — fall back to env-based credentials for resilience
      console.error("validate_staff_login RPC error:", error.message);
      return { success: false, error: "Authentication service unavailable." };
    }

    return result as { success: boolean; username?: string; role?: string; display_name?: string; error?: string };
  });

// ════════════════════════════════════════════════════════════
// PHASE 9.5 — STAFF ACCOUNT MANAGEMENT
// ════════════════════════════════════════════════════════════

// ── Get all staff accounts (admin only) ───────────────────────────────────────
export const getAllStaffAccounts = createServerFn({ method: "POST" })
  .validator((d: { callerRole?: string }) => d)
  .handler(async ({ data }) => {
    checkRole("getAllStaffAccounts", data.callerRole);
    const sb = getSupabase();

    const { data: result, error } = await sb.rpc("get_all_staff_accounts");
    if (error) {
      throw new Error(`Database error: ${error.message}. Please ensure supabase-phase9.5.sql has been executed.`);
    }

    const parsed = result as { success: boolean; data?: any[]; error?: string };
    if (!parsed.success) {
      throw new Error(parsed.error ?? "Failed to fetch staff accounts");
    }

    // Ensure is_online defaults to false for all staff accounts
    const staffAccounts = (parsed.data ?? []).map((staff: any) => ({
      ...staff,
      is_online: Boolean(staff.is_online),
    }));

    return staffAccounts;
  });

// ── Get single staff account by ID (admin only) ───────────────────────────────
export const getStaffAccountById = createServerFn({ method: "POST" })
  .validator((d: { id: number; callerRole?: string }) => d)
  .handler(async ({ data }) => {
    checkRole("getStaffAccountById", data.callerRole);
    const sb = getSupabase();

    const { data: result, error } = await sb.rpc("get_staff_account_by_id", { p_id: data.id });
    if (error) {
      throw new Error(`Database error: ${error.message}. Please ensure supabase-phase9.5.sql has been executed.`);
    }

    const parsed = result as { success: boolean; data?: any; error?: string };
    if (!parsed.success) {
      throw new Error(parsed.error ?? "Failed to fetch staff account");
    }

    return parsed.data;
  });

// ── Create new staff account (admin only) ───────────────────────────────────────
export const createStaffAccount = createServerFn({ method: "POST" })
  .validator((d: {
    username: string;
    password: string;
    role: string;
    displayName: string;
    isActive: boolean;
    callerRole?: string;
  }) => d)
  .handler(async ({ data }) => {
    checkRole("createStaffAccount", data.callerRole);
    const sb = getSupabase();

    // Validate password strength
    if (data.password.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }

    const { data: result, error } = await sb.rpc("create_staff_account", {
      p_username: data.username.toLowerCase().trim(),
      p_password: data.password,
      p_role: data.role,
      p_display_name: data.displayName,
      p_is_active: data.isActive,
    });

    if (error) {
      throw new Error(`Database error: ${error.message}. Please ensure supabase-phase9.5.sql has been executed.`);
    }

    const parsed = result as { success: boolean; data?: any; error?: string };
    if (!parsed.success) {
      throw new Error(parsed.error ?? "Failed to create staff account");
    }

    return parsed.data;
  });

// ── Update staff account (admin only) ───────────────────────────────────────────
export const updateStaffAccount = createServerFn({ method: "POST" })
  .validator((d: {
    id: number;
    username: string;
    role: string;
    displayName: string;
    isActive: boolean;
    callerRole?: string;
  }) => d)
  .handler(async ({ data }) => {
    checkRole("updateStaffAccount", data.callerRole);
    const sb = getSupabase();

    const { data: result, error } = await sb.rpc("update_staff_account", {
      p_id: data.id,
      p_username: data.username.toLowerCase().trim(),
      p_role: data.role,
      p_display_name: data.displayName,
      p_is_active: data.isActive,
    });

    if (error) {
      throw new Error(`Database error: ${error.message}. Please ensure supabase-phase9.5.sql has been executed.`);
    }

    const parsed = result as { success: boolean; data?: any; error?: string };
    if (!parsed.success) {
      throw new Error(parsed.error ?? "Failed to update staff account");
    }

    return parsed.data;
  });

// ── Reset staff password (admin only) ─────────────────────────────────────────
export const resetStaffPassword = createServerFn({ method: "POST" })
  .validator((d: {
    id: number;
    newPassword: string;
    callerRole?: string;
  }) => d)
  .handler(async ({ data }) => {
    checkRole("resetStaffPassword", data.callerRole);
    const sb = getSupabase();

    // Validate password strength
    if (data.newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }

    const { data: result, error } = await sb.rpc("reset_staff_password", {
      p_id: data.id,
      p_new_password: data.newPassword,
    });

    if (error) {
      throw new Error(`Database error: ${error.message}. Please ensure supabase-phase9.5.sql has been executed.`);
    }

    const parsed = result as { success: boolean; message?: string; error?: string };
    if (!parsed.success) {
      throw new Error(parsed.error ?? "Failed to reset password");
    }

    return { success: true, message: parsed.message };
  });

// ── Toggle staff account active status (admin only) ────────────────────────────
export const toggleStaffStatus = createServerFn({ method: "POST" })
  .validator((d: {
    id: number;
    callerRole?: string;
  }) => d)
  .handler(async ({ data }) => {
    checkRole("toggleStaffStatus", data.callerRole);
    const sb = getSupabase();

    const { data: result, error } = await sb.rpc("toggle_staff_account_status", { p_id: data.id });
    if (error) {
      throw new Error(`Database error: ${error.message}. Please ensure supabase-phase9.5.sql has been executed.`);
    }

    const parsed = result as { success: boolean; data?: any; error?: string };
    if (!parsed.success) {
      throw new Error(parsed.error ?? "Failed to toggle staff status");
    }

    return parsed.data;
  });

// ── Delete staff account (admin only) ────────────────────────────────────────────
export const deleteStaffAccount = createServerFn({ method: "POST" })
  .validator((d: {
    id: number;
    callerRole?: string;
  }) => d)
  .handler(async ({ data }) => {
    checkRole("deleteStaffAccount", data.callerRole);
    const sb = getSupabase();

    const { data: result, error } = await sb.rpc("delete_staff_account", { p_id: data.id });
    if (error) {
      throw new Error(`Database error: ${error.message}. Please ensure supabase-phase9.5.sql has been executed.`);
    }

    const parsed = result as { success: boolean; message?: string; error?: string };
    if (!parsed.success) {
      throw new Error(parsed.error ?? "Failed to delete staff account");
    }

    return { success: true, message: parsed.message };
  });

// ── Update doctor online status (doctor/admin only) ─────────────────────────────
export const updateDoctorOnlineStatus = createServerFn({ method: "POST" })
  .validator((d: {
    username: string;
    isOnline: boolean;
    callerRole?: string;
  }) => d)
  .handler(async ({ data }) => {
    checkRole("updateDoctorOnlineStatus", data.callerRole);
    const sb = getSupabase();

    // Use direct table update for reliable status changes
    const updateData: any = { is_online: data.isOnline };
    
    // Only update last_login when setting online
    if (data.isOnline) {
      updateData.last_login = new Date().toISOString();
    }

    const { error } = await sb
      .from("staff_accounts")
      .update(updateData)
      .eq("username", data.username.toLowerCase())
      .in("role", ["DOCTOR", "doctor"]);

    if (error) {
      throw new Error(`Database error: ${error.message}. Failed to update doctor online status.`);
    }

    return { success: true, message: `Doctor ${data.isOnline ? 'online' : 'offline'} status updated successfully` };
  });
