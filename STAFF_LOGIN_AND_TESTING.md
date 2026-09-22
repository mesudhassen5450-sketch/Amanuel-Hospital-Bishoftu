# Staff Login & Testing Guide — Dr. Amanuel Hospital

**Site:** https://amanuelhospital.com.et  
**Staff login:** https://amanuelhospital.com.et/staff/login  
**API health:** https://amanuel-hospital-backend.onrender.com/api/health  

> Change default passwords after first successful login. Do not share production passwords in public chats.

---

## 1. Confirm system is healthy

Open:

```text
https://amanuel-hospital-backend.onrender.com/api/health
```

You want:

```json
{ "status": "ok", "database": { "status": "connected" } }
```

If status is `degraded` / database unreachable, fix Render `DATABASE_URL` + `DIRECT_URL` first.

---

## 2. Admin login

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `admin123` |
| Opens | Admin Dashboard (`/staff/admin`) |

### What to test as Admin
1. Sign in at `/staff/login`
2. Open **Staff List** — doctors and other roles should appear
3. Edit a doctor → change specialty / bio / experience → **Save Changes**
4. Open public page `/doctors` (hard refresh) → profile should match
5. Reset a doctor password (Actions → password) if needed
6. Confirm Online/Offline updates when that staff signs in / out

---

## 3. Doctor logins

Public doctors currently include:

| Username | Display name | Specialty (public) |
|---|---|---|
| `doctor@amanuel` | Amanauel Hailemariam | (General Surgeon & Chief Clinician) |
| `doctor@zenebe` | Zenebe Hubena | Obstetrics and Gynecology |
| `doctor@bonsa` | Bonsa | Orthopedics |
| `doctor@teshale` | Teshale Tilahun | Internal Medicine |
| `doctor@yebeltal` | Yebeltal | ENT specialist |
| `doctor@yeshi` | Yeshi | Ophthalmologist |
| `doctor@gemechu` | Gemechu Teshita | Neurology |
| `doctor@samuel` | Samuel | Pediatrics |
| `doctor@nigusse` | Nigusse | Dermatology |
| `doctor@tesmammi` | tesmammi | Psychiatrist |
| `dr.amanuel` | Dr. Amanuel | General Practice (seed account) |

### Doctor password
Use the password you set in **Admin → Staff → Reset Password** for that doctor.

If you reset every doctor to the same temporary password (example: `admin123`), then:

| Field | Value |
|---|---|
| Username | e.g. `doctor@amanuel` |
| Password | the password you set in Admin (e.g. `admin123`) |
| Opens | Doctor Dashboard (`/staff/doctor/dashboard`) |

### What to test as Doctor
1. Sign in with `doctor@…` username
2. Keep the **Doctor Dashboard** open
3. On a phone/another browser (logged out of staff), open the site → start **Video Call** / request that doctor
4. Doctor should get the **consultation request** popup
5. Doctor taps **I'm Available & Ready**
6. Patient proceeds to payment / room
7. After payment, doctor should get the **incoming call** UI
8. Accept call → both join consultation room

---

## 4. Other staff roles (if accounts exist)

Typical usernames (only if created / seeded):

| Role | Example username | Dashboard |
|---|---|---|
| Reception | `reception` / `receptionist` | `/staff/dashboard` |
| Cashier | `cashier` | `/staff/payments` |
| Laboratory | `laboratory` / `labtech` | `/staff/laboratory/dashboard` |
| Pharmacy | `pharmacist` | `/staff/pharmacy/dashboard` |

Passwords = whatever Admin set (or seed default `admin123` only for newly seeded unused accounts).

---

## 5. Public pages to check

| Page | URL | Check |
|---|---|---|
| Home | `/` | Loads |
| Doctors | `/doctors` | Unique specialty/bio per doctor |
| Booking | `/booking` | Can select doctor |
| AI Assistant | site chat button | Answers (needs `GROQ_API_KEY` on Netlify) |
| Video call request | Doctors / Video Call | Notifies signed-in doctor |

---

## 6. Quick “all done?” checklist

- [ ] `/api/health` → `ok` + DB connected  
- [ ] Admin login `admin` / `admin123` works  
- [ ] Admin can edit doctor profile and public `/doctors` updates  
- [ ] Doctor login `doctor@amanuel` (password you reset) works  
- [ ] Patient request → doctor sees notification  
- [ ] Doctor accepts → patient can continue to payment/call  
- [ ] Change `admin123` to a strong password after testing  

---

## 7. Render env (reference)

Web service **amanuel-hospital-backend** must have:

- `DATABASE_URL` → Supabase pooler `:6543?pgbouncer=true`
- `DIRECT_URL` → Supabase session `:5432`
- `JWT_SECRET`, `CORS_ORIGIN`, `FRONTEND_URL`, etc.

Do **not** use the old Render host `dpg-…` anymore.
