import {
  Stethoscope,
  Siren,
  Slice,
  Baby,
  HeartPulse,
  Brain,
  Bone,
  Eye,
  Activity,
  Ear,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

// Use public folder paths for doctor images
const doctor1 = "/doctor1.jpg";
const doctor2 = "/doctor2.jpg";
const doctor3 = "/doctor3.jpg";
const doctor4 = "/doctor4.jpg";
const doctor5 = "/doctor1.jpg";
const doctor6 = "/doctor2.jpg";
import galleryLab from "@/assets/machine.jpg";
import gallerySurgery from "@/assets/room.jpg";
import galleryPediatrics from "@/assets/baby.jpg";
import galleryRadiology from "@/assets/machine.jpg";
import galleryPharmacy from "@/assets/aman pharmacy.jpg";
import galleryWard from "@/assets/room.jpg";
import aboutLobby from "@/assets/bero.jpg";

export interface Service {
  id: string;
  title: string;
  description: string;
  detail: string;
  icon: LucideIcon;
}

export const services: Service[] = [
  {
    id: "emergency-services",
    title: "Emergency Services",
    description: "24/7 emergency services are available at the hospital.",
    detail:
      "Amanuel Hospital provides emergency services 24 hours a day, 7 days a week.",
    icon: Siren,
  },
  {
    id: "medical-services",
    title: "Medical Services",
    description: "General medical care provided by the hospital.",
    detail:
      "The hospital provides general medical care for patients who need medical services.",
    icon: Stethoscope,
  },
  {
    id: "surgical-services",
    title: "Surgical Services",
    description: "24-hour surgical services are available at the hospital.",
    detail:
      "Amanuel Hospital provides surgical services around the clock, 24 hours a day.",
    icon: Slice,
  },
  {
    id: "pediatric-services",
    title: "Pediatric Services",
    description: "Medical care for children.",
    detail:
      "The hospital provides medical care for children.",
    icon: Baby,
  },
  {
    id: "gynecology-obstetrics",
    title: "Gynecology & Obstetrics",
    description: "Women's health, obstetric, and gynecological care.",
    detail:
      "The hospital provides women's health care, including obstetric and gynecological services.",
    icon: HeartPulse,
  },
  {
    id: "ent-services",
    title: "ENT Services",
    description: "ENT services through specialists, including tonsillectomy and other ENT services.",
    detail:
      "The hospital provides ear, nose, and throat (ENT) services through specialists. This includes tonsillectomy and other ENT services.",
    icon: Ear,
  },
  {
    id: "emergency-surgery-delivery",
    title: "Emergency Surgeries & Deliveries",
    description: "All emergency surgeries and deliveries are available 24/7.",
    detail:
      "Emergency surgeries and emergency deliveries are available 24 hours a day, 7 days a week.",
    icon: Activity,
  },
  {
    id: "orthopedic-services",
    title: "Orthopedic Surgical Services",
    description: "Orthopedic surgical services are available 24/7.",
    detail:
      "The hospital provides orthopedic surgical services 24 hours a day, 7 days a week.",
    icon: Bone,
  },
];

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  /** Numeric years of experience (from DB), or null if not set */
  experienceYears: number | null;
  /** Display-ready string e.g. "10+ years experience" */
  experience: string;
  /** Per-consultation fee in ETB, or null if not set */
  consultationFee: number | null;
  /** Star rating (0–5), or null if not set */
  rating: number | null;
  /** Doctor profile status e.g. "active", "on_leave" */
  status: string | null;
  bio: string;
  availableToday: boolean;
  isOnline: boolean;
  isAvailable: boolean;
  photo: string;
  lastSeen?: string | null;
}

export const doctors: Doctor[] = [];

export interface Department {
  name: string;
  description: string;
  icon: LucideIcon;
}

export const departments: Department[] = [
  {
    name: "Internal Medicine",
    description: "Clinical specialty in internal medicine.",
    icon: Stethoscope,
  },
  {
    name: "General Surgery",
    description: "Clinical specialty in general surgery.",
    icon: Slice,
  },
  {
    name: "Orthopedic Surgery",
    description: "Clinical specialty in orthopedic surgery.",
    icon: Bone,
  },
  {
    name: "Obstetrics & Gynecology",
    description: "Clinical specialty in obstetrics and gynecology.",
    icon: HeartPulse,
  },
  {
    name: "ENT",
    description: "Ear, nose, and throat specialty.",
    icon: Ear,
  },
  {
    name: "Ophthalmology",
    description: "Eye care and ophthalmology specialty.",
    icon: Eye,
  },
  {
    name: "Neurosurgery",
    description: "Clinical specialty in neurosurgery.",
    icon: Brain,
  },
  {
    name: "Pediatric Surgery",
    description: "Clinical specialty in pediatric surgery.",
    icon: Baby,
  },
  {
    name: "Dermatology",
    description: "Clinical specialty in dermatology.",
    icon: Sparkles,
  },
  {
    name: "Psychiatry",
    description: "Clinical specialty in psychiatry.",
    icon: Users,
  },
];

export interface Vacancy {
  title: string;
  type: string;
  department: string;
  requirements: string[];
}

export const vacancies: Vacancy[] = [
  {
    title: "General Practitioner",
    type: "Full-time",
    department: "Outpatient Department",
    requirements: [
      "Doctor of Medicine (MD) degree",
      "Valid professional license",
      "2+ years clinical experience",
      "Strong communication skills in Amharic, Afaan Oromo and English",
    ],
  },
  {
    title: "Registered Nurse",
    type: "Full-time",
    department: "Inpatient Ward",
    requirements: [
      "BSc in Nursing",
      "Valid nursing license",
      "1+ years hospital experience preferred",
      "Willingness to work rotating shifts",
    ],
  },
  {
    title: "Laboratory Technologist",
    type: "Full-time",
    department: "Laboratory",
    requirements: [
      "BSc in Medical Laboratory Science",
      "Experience with automated analyzers",
      "Attention to detail and quality control mindset",
    ],
  },
  {
    title: "Midwife",
    type: "Full-time",
    department: "Maternity",
    requirements: [
      "BSc in Midwifery",
      "Valid professional license",
      "Experience in labor & delivery care",
    ],
  },
  {
    title: "Pharmacist",
    type: "Part-time",
    department: "Pharmacy",
    requirements: [
      "BPharm degree with valid license",
      "Knowledge of pharmacy inventory systems",
      "Customer-focused attitude",
    ],
  },
  {
    title: "Receptionist / Cashier",
    type: "Full-time",
    department: "Administration",
    requirements: [
      "Diploma or degree in a related field",
      "Basic computer skills",
      "Fluency in Amharic, Afaan Oromo and English",
    ],
  },
];

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
}

export const galleryImages: GalleryImage[] = [
  { id: "lab", src: galleryLab, alt: "Hospital laboratory with modern microscopes", width: 900, height: 1200 },
  { id: "surgery", src: gallerySurgery, alt: "Modern operating theater with surgical lights", width: 1200, height: 800 },
  { id: "pediatrics", src: galleryPediatrics, alt: "Nurse caring for a child in the pediatric ward", width: 1200, height: 900 },
  { id: "radiology", src: galleryRadiology, alt: "Hospital medical equipment", width: 900, height: 1100 },
  { id: "pharmacy", src: galleryPharmacy, alt: "Hospital pharmacy with organized medicine shelves", width: 1200, height: 800 },
  { id: "ward", src: galleryWard, alt: "Bright modern patient room", width: 900, height: 1200 },
  { id: "lobby", src: aboutLobby, alt: "Hospital reception lobby", width: 1200, height: 900 },
];

export interface Testimonial {
  name: string;
  role: string;
  quote: string;
}

export const testimonials: Testimonial[] = [
  {
    name: "Tigist A.",
    role: "Maternity patient",
    quote:
      "The maternity team made my delivery safe and comfortable. The midwives were with me every step of the way — I felt truly cared for.",
  },
  {
    name: "Getachew M.",
    role: "Surgery patient",
    quote:
      "From admission to discharge, everything was professional and clean. My operation went smoothly and the follow-up care was excellent.",
  },
  {
    name: "Hiwot K.",
    role: "Parent of pediatric patient",
    quote:
      "My daughter was treated so gently in the pediatric ward. The doctors explained everything clearly and she recovered quickly.",
  },
  {
    name: "Bekele T.",
    role: "Emergency patient",
    quote:
      "I arrived at midnight with severe pain and was seen within minutes. The 24/7 emergency service truly saved my life.",
  },
];

export interface Faq {
  question: string;
  answer: string;
}

export const faqs: Faq[] = [
  {
    question: "What are the hospital's working hours?",
    answer:
      "Our outpatient departments operate Monday to Saturday from 8:00 AM to 8:00 PM. The emergency department is open 24 hours a day, 7 days a week.",
  },
  {
    question: "Do I need an appointment to see a doctor?",
    answer:
      "Walk-ins are welcome for general consultations, but we recommend booking an appointment to reduce your waiting time, especially for specialist visits.",
  },
  {
    question: "Does the hospital accept health insurance?",
    answer:
      "We work with several insurance providers and employer health schemes. Please contact our reception with your insurance details to confirm coverage.",
  },
  {
    question: "Is there a 24/7 emergency service?",
    answer:
      "Yes. Our emergency department is staffed around the clock with emergency physicians, nurses and ambulance coordination.",
  },
  {
    question: "Can I get laboratory tests without a doctor's referral?",
    answer:
      "Selected routine tests are available on request. For specialized tests we recommend a consultation first so results can be properly interpreted.",
  },
  {
    question: "How do I get my medical records or test results?",
    answer:
      "Test results can be collected at the laboratory reception or sent to your doctor directly. Medical record requests are handled by our administration office.",
  },
];

export const stats = [
  { label: "Emergency Service", value: 24, suffix: "/7" },
  { label: "Experienced Doctors", value: 35, suffix: "+" },
  { label: "Modern Equipment Units", value: 120, suffix: "+" },
  { label: "Patients Served", value: 85000, suffix: "+" },
];

export const contactInfo = {
  phone: "0114303030 / 00",
  emergency: "0114303030 / 00",
  email: "dramanuelhospital@gmail.com",
  location: "Bishoftu (Debre Zeyit), Oromia, Ethiopia",
  hours: "Mon–Sat: 8:00 AM – 8:00 PM · Emergency: 24/7",
};
