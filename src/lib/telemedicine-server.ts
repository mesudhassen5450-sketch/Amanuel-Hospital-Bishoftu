import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { sendPushToUserIdOrRole } from "../routes/api/send-push";

function getSupabase() {
  const url = process.env["VITE_SUPABASE_URL"]
    ?? (typeof import.meta !== "undefined" ? (import.meta as any).env?.["VITE_SUPABASE_URL"] : undefined)
    ?? process.env["SUPABASE_URL"];
  const key = process.env["VITE_SUPABASE_ANON_KEY"]
    ?? (typeof import.meta !== "undefined" ? (import.meta as any).env?.["VITE_SUPABASE_ANON_KEY"] : undefined)
    ?? process.env["SUPABASE_ANON_KEY"];
  return createClient(url || "", key || "");
}

export const requestVideoConsultation = createServerFn({ method: "POST" })
  .validator((d: {
    doctorId: string;
    doctorUsername?: string;
    patientName: string;
    phoneNumber: string;
    consultationFee: number;
  }) => d)
  .handler(async ({ data }: { data: any }) => {
    const { doctorId, patientName, phoneNumber, consultationFee } = data;
    const sb = getSupabase();

    try {
      // doctor.id from /api/doctors is a numeric staff id — resolve real login username
      let doctorUsername = String(data.doctorUsername || "").toLowerCase().trim();
      const doctorKey = String(doctorId || "").trim();

      if (!doctorUsername || /^\d+$/.test(doctorUsername)) {
        if (doctorKey && !/^\d+$/.test(doctorKey)) {
          doctorUsername = doctorKey.toLowerCase();
        } else if (doctorKey) {
          const { data: staff } = await sb
            .from("staff_accounts")
            .select("username")
            .eq("id", doctorKey)
            .maybeSingle();
          doctorUsername = (staff?.username || doctorKey).toLowerCase().trim();
        }
      }

      if (!doctorUsername) {
        throw new Error("Doctor username is required to request a consultation");
      }

      console.log(
        `[requestVideoConsultation] doctorId=${doctorKey} resolved username=${doctorUsername}`
      );

      // Insert appointment into Supabase
      // For video consultations, always set amount to 100 ETB
      const insertData: any = {
        doctor_id: doctorKey || doctorUsername,
        doctor_username: doctorUsername,
        patient_name: patientName,
        phone_number: phoneNumber,
        consultation_type: "ONLINE",
        consultation_fee: 100, // Fixed fee for video consultations
        amount: 100, // Payment amount for gateway
        payment_status: "UNPAID",
        call_status: "REQUESTING_DOCTOR",
        created_at: new Date().toISOString(),
      };

      console.log("Inserting appointment with data:", insertData);

      const { data: appointment, error } = await sb
        .from("appointments")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("Supabase insert error:", error);
        throw new Error(`Failed to create appointment: ${error.message}`);
      }

      // Trigger Desktop Push Notification for doctor (by username)
      sendPushToUserIdOrRole(doctorUsername, "doctor", {
        title: "Incoming Video Consultation",
        body: `${patientName} has requested an online video consultation.`,
        url: `/staff/doctor/dashboard`,
      }).catch((err) => console.error("Push notify doctor error:", err));

      return {
        appointmentId: appointment.id,
        doctorUsername,
        message: "Consultation request sent successfully",
      };
    } catch (error: any) {
      console.error("requestVideoConsultation error:", error);
      throw new Error(`Server error: ${error.message || "Unknown error"}`);
    }
  });

export const acceptConsultationRequest = createServerFn({ method: "POST" })
  .validator((d: { appointmentId: string }) => d)
  .handler(async ({ data }: { data: any }) => {
    const { appointmentId } = data;
    const sb = getSupabase();

    const { data: updatedData, error } = await sb
      .from("appointments")
      .update({
        call_status: "in_call",
        booking_status: "confirmed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointmentId)
      .select();

    if (error) {
      console.error("Accept Call Supabase Error:", error);
      throw new Error(`Failed to accept consultation: ${error.message}`);
    }

    // Trigger Desktop Push Notification for patient
    if (updatedData && updatedData[0]) {
      const apt = updatedData[0];
      const targetUser = apt.patient_name || apt.phone_number || appointmentId;
      sendPushToUserIdOrRole(targetUser, "patient", {
        title: "Consultation Accepted",
        body: "Dr. Amanuel Hospital doctor has accepted your video call. Click to join now.",
        url: `/appointments/${appointmentId}`,
      }).catch((err) => console.error("Push notify patient error:", err));
    }

    return { success: true, data: updatedData };
  });

export const declineConsultationRequest = createServerFn({ method: "POST" })
  .validator((d: { appointmentId: string }) => d)
  .handler(async ({ data }: { data: any }) => {
    const { appointmentId } = data;
    const sb = getSupabase();

    const { error } = await sb
      .from("appointments")
      .update({
        call_status: "cancelled",
        booking_status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointmentId);

    if (error) {
      throw new Error(`Failed to decline consultation: ${error.message}`);
    }

    return { success: true };
  });

export const processConsultationPayment = createServerFn({ method: "POST" })
  .validator((d: { appointmentId: string; amount: number }) => d)
  .handler(async ({ data }: { data: any }) => {
    const { appointmentId, amount } = data;
    const sb = getSupabase();

    const { error } = await sb
      .from("appointments")
      .update({
        payment_status: "paid",
        booking_status: "confirmed",
        call_status: "in_call",
        payment_amount: amount,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointmentId);

    if (error) {
      throw new Error(`Failed to process payment: ${error.message}`);
    }

    return { success: true };
  });

export const saveClinicalNotes = createServerFn({ method: "POST" })
  .validator((d: {
    appointmentId: string;
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    prescriptions: Array<{
      medication: string;
      dosage: string;
      frequency: string;
      duration: string;
    }>;
  }) => d)
  .handler(async ({ data }: { data: any }) => {
    const { appointmentId, subjective, objective, assessment, plan, prescriptions } = data;
    const sb = getSupabase();

    // Save clinical notes to consultation_notes table
    const { error: notesError } = await sb
      .from("consultation_notes")
      .insert({
        appointment_id: appointmentId,
        subjective,
        objective,
        assessment,
        plan,
        created_at: new Date().toISOString(),
      });

    if (notesError) {
      throw new Error(`Failed to save clinical notes: ${notesError.message}`);
    }

    // Save prescriptions if any
    if (prescriptions && prescriptions.length > 0) {
      const prescriptionsData = prescriptions.map((prescription: any) => ({
        appointment_id: appointmentId,
        medication: prescription.medication,
        dosage: prescription.dosage,
        frequency: prescription.frequency,
        duration: prescription.duration,
        created_at: new Date().toISOString(),
      }));

      const { error: prescriptionsError } = await sb
        .from("prescriptions")
        .insert(prescriptionsData);

      if (prescriptionsError) {
        throw new Error(`Failed to save prescriptions: ${prescriptionsError.message}`);
      }
    }

    return { success: true };
  });
