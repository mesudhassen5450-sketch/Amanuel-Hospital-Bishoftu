import type { PrismaClient } from '@prisma/client';

export type DoctorProfileInput = {
  specialty?: string | null;
  experience?: string | null;
  experienceYears?: number | null;
  bio?: string | null;
};

export type DoctorProfileRow = {
  username: string;
  specialty: string;
  experience: string | null;
  experienceYears: number | null;
  bio: string | null;
  consultationFee?: any;
  rating?: any;
  status?: string | null;
  isAvailable?: boolean;
};

function buildExperience(
  experience: string | null | undefined,
  experienceYears: number | null | undefined
): string {
  if (experience && String(experience).trim()) return String(experience).trim();
  if (experienceYears != null && Number.isFinite(Number(experienceYears))) {
    const years = Number(experienceYears);
    return years >= 30 ? '30+ years experience' : `${years}+ years experience`;
  }
  return '5+ years experience';
}

/**
 * Upsert a public doctor profile keyed by staff username.
 * Uses case-insensitive lookup so casing differences don't create orphan rows.
 */
export async function upsertDoctorProfile(
  prisma: PrismaClient,
  username: string,
  input: DoctorProfileInput
): Promise<DoctorProfileRow> {
  const cleanUsername = username.toLowerCase().trim();
  const specialty = (input.specialty && String(input.specialty).trim()) || 'General Practice';
  const experienceYears =
    input.experienceYears != null && Number.isFinite(Number(input.experienceYears))
      ? Number(input.experienceYears)
      : null;
  const experience = buildExperience(input.experience, experienceYears);
  const bio =
    input.bio != null && String(input.bio).trim()
      ? String(input.bio).trim()
      : 'Specialist physician at Dr. Amanuel Hospital.';

  const existing = await prisma.doctor.findFirst({
    where: {
      username: {
        equals: cleanUsername,
        mode: 'insensitive',
      },
    },
    select: { id: true },
  });

  const row = existing
    ? await prisma.doctor.update({
        where: { id: existing.id },
        data: {
          username: cleanUsername,
          specialty,
          experience,
          experienceYears: experienceYears ?? undefined,
          bio,
          isAvailable: true,
        },
        select: {
          username: true,
          specialty: true,
          experience: true,
          experienceYears: true,
          bio: true,
          consultationFee: true,
          rating: true,
          status: true,
          isAvailable: true,
        },
      })
    : await prisma.doctor.create({
        data: {
          username: cleanUsername,
          specialty,
          experience,
          experienceYears: experienceYears ?? undefined,
          bio,
          isAvailable: true,
        },
        select: {
          username: true,
          specialty: true,
          experience: true,
          experienceYears: true,
          bio: true,
          consultationFee: true,
          rating: true,
          status: true,
          isAvailable: true,
        },
      });

  return {
    username: row.username,
    specialty: row.specialty,
    experience: row.experience ?? null,
    experienceYears: row.experienceYears ?? null,
    bio: row.bio ?? null,
    consultationFee: row.consultationFee,
    rating: row.rating,
    status: row.status ?? null,
    isAvailable: row.isAvailable,
  };
}

/** Load all doctor profiles indexed by lowercase username. */
export async function loadDoctorProfileMap(
  prisma: PrismaClient
): Promise<Map<string, DoctorProfileRow>> {
  const map = new Map<string, DoctorProfileRow>();
  try {
    const profiles = await prisma.doctor.findMany({
      select: {
        username: true,
        specialty: true,
        experience: true,
        experienceYears: true,
        bio: true,
        consultationFee: true,
        rating: true,
        status: true,
        isAvailable: true,
      },
    });
    for (const p of profiles) {
      map.set(p.username.toLowerCase(), {
        username: p.username,
        specialty: p.specialty,
        experience: p.experience ?? null,
        experienceYears: p.experienceYears ?? null,
        bio: p.bio ?? null,
        consultationFee: p.consultationFee,
        rating: p.rating,
        status: p.status ?? null,
        isAvailable: p.isAvailable,
      });
    }
  } catch (err: any) {
    console.warn('[DoctorProfile] loadDoctorProfileMap failed:', err?.message || err);
  }
  return map;
}
