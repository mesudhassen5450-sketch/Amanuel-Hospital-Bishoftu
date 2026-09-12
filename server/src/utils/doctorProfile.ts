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

let schemaReady: Promise<void> | null = null;

/**
 * Production DBs may predate Prisma fields. Add missing columns so
 * Admin specialty/bio saves and public /api/doctors reads succeed.
 */
export async function ensureDoctorSchema(prisma: PrismaClient): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const statements = [
        `ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "experience_years" INTEGER`,
        `ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active'`,
        `ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "consultation_fee" DECIMAL(10,2)`,
        `ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "rating" DECIMAL(3,2)`,
        `ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "is_available" BOOLEAN DEFAULT true`,
        `ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "department_id" TEXT`,
        `ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "experience" TEXT`,
        `ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "bio" TEXT`,
        `ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "specialty" TEXT`,
      ];
      for (const sql of statements) {
        try {
          await prisma.$executeRawUnsafe(sql);
        } catch (err: any) {
          console.warn('[DoctorProfile] schema ensure skipped:', sql, err?.message || err);
        }
      }
      console.log('[DoctorProfile] doctors table schema checked/updated');
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  await schemaReady;
}

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

function mapRow(row: any): DoctorProfileRow {
  return {
    username: row.username,
    specialty: row.specialty,
    experience: row.experience ?? null,
    experienceYears: row.experienceYears ?? row.experience_years ?? null,
    bio: row.bio ?? null,
    consultationFee: row.consultationFee ?? row.consultation_fee,
    rating: row.rating,
    status: row.status ?? null,
    isAvailable: row.isAvailable ?? row.is_available,
  };
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
  await ensureDoctorSchema(prisma);

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

  const dataFull = {
    username: cleanUsername,
    specialty,
    experience,
    experienceYears: experienceYears ?? undefined,
    bio,
    status: 'active' as const,
    isAvailable: true,
  };

  const dataMinimal = {
    username: cleanUsername,
    specialty,
    experience,
    bio,
    isAvailable: true,
  };

  try {
    const row = existing
      ? await prisma.doctor.update({
          where: { id: existing.id },
          data: dataFull,
        })
      : await prisma.doctor.create({
          data: dataFull,
        });
    return mapRow(row);
  } catch (err: any) {
    console.warn(
      '[DoctorProfile] full upsert failed, retrying minimal columns:',
      err?.message || err
    );
    const row = existing
      ? await prisma.doctor.update({
          where: { id: existing.id },
          data: dataMinimal,
        })
      : await prisma.doctor.create({
          data: dataMinimal,
        });
    return mapRow(row);
  }
}

/** Load all doctor profiles indexed by lowercase username. */
export async function loadDoctorProfileMap(
  prisma: PrismaClient
): Promise<Map<string, DoctorProfileRow>> {
  const map = new Map<string, DoctorProfileRow>();
  try {
    await ensureDoctorSchema(prisma);
  } catch (err: any) {
    console.warn('[DoctorProfile] ensureDoctorSchema before load failed:', err?.message || err);
  }

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
      map.set(p.username.toLowerCase(), mapRow(p));
    }
    return map;
  } catch (err: any) {
    console.warn(
      '[DoctorProfile] full profile load failed, retrying core columns:',
      err?.message || err
    );
  }

  try {
    const profiles = await prisma.$queryRaw<
      Array<{
        username: string;
        specialty: string | null;
        experience: string | null;
        bio: string | null;
      }>
    >`SELECT username, specialty, experience, bio FROM doctors`;
    for (const p of profiles) {
      if (!p?.username) continue;
      map.set(p.username.toLowerCase(), {
        username: p.username,
        specialty: p.specialty || 'General Practice',
        experience: p.experience ?? null,
        experienceYears: null,
        bio: p.bio ?? null,
      });
    }
  } catch (err: any) {
    console.warn('[DoctorProfile] loadDoctorProfileMap failed:', err?.message || err);
  }
  return map;
}
