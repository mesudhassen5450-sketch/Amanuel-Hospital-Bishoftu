import type { PrismaClient } from '@prisma/client';

const USERNAME_ALIASES: Record<string, string[]> = {
  pharmacy: ['pharmacy', 'pharmacist'],
  pharmacist: ['pharmacy', 'pharmacist'],
  laboratory: ['laboratory', 'labtech', 'lab'],
  lab: ['laboratory', 'labtech', 'lab'],
  labtech: ['laboratory', 'labtech', 'lab'],
  reception: ['reception', 'receptionist'],
  receptionist: ['reception', 'receptionist'],
};

const ROLE_KEYS: Record<string, string[]> = {
  pharmacy: ['pharmacy', 'pharmacist'],
  pharmacist: ['pharmacy', 'pharmacist'],
  laboratory: ['laboratory', 'lab', 'lab_tech', 'labtech'],
  lab: ['laboratory', 'lab', 'lab_tech', 'labtech'],
  labtech: ['laboratory', 'lab', 'lab_tech', 'labtech'],
  reception: ['reception', 'receptionist'],
  receptionist: ['reception', 'receptionist'],
  staff: ['staff'],
  cashier: ['cashier'],
  doctor: ['doctor'],
  admin: ['admin', 'administrator'],
};

function uniqueNames(values: Array<string | null | undefined>): string[] {
  const names = new Set<string>();
  for (const value of values) {
    const trimmed = String(value || '').trim();
    if (!trimmed || /^\d+$/.test(trimmed)) continue;
    const key = trimmed.toLowerCase();
    names.add(trimmed);
    for (const alias of USERNAME_ALIASES[key] || [key]) {
      names.add(alias);
    }
  }
  return [...names];
}

export async function resolveStaffAccount(
  prisma: PrismaClient,
  opts: { id?: string | number | null; username?: string | null }
) {
  const rawId = opts.id != null ? String(opts.id).trim() : '';
  const username = opts.username != null ? String(opts.username).trim() : '';

  if (rawId && /^\d+$/.test(rawId)) {
    try {
      const byId = await prisma.staffAccount.findFirst({
        where: { id: BigInt(rawId) },
      });
      if (byId) return byId;
    } catch {
      // ignore invalid ids
    }
  }

  for (const name of uniqueNames([username, rawId])) {
    const byName = await prisma.staffAccount.findFirst({
      where: {
        username: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });
    if (byName) return byName;
  }

  const loginKey = (username || rawId).toLowerCase();
  const roles = ROLE_KEYS[loginKey];
  if (roles?.length) {
    const matches = await prisma.staffAccount.findMany({
      where: {
        isActive: true,
        OR: roles.map((role) => ({
          role: {
            equals: role,
            mode: 'insensitive' as const,
          },
        })),
      },
    });
    if (matches.length === 1) return matches[0];
    const exact = matches.find((row) => row.username.toLowerCase() === loginKey);
    if (exact) return exact;
  }

  return null;
}

export async function deleteLinkedDoctorProfile(
  prisma: PrismaClient,
  username: string | null | undefined
) {
  const clean = String(username || '').trim();
  if (!clean) return;
  try {
    await prisma.doctor.deleteMany({
      where: {
        username: {
          equals: clean,
          mode: 'insensitive',
        },
      },
    });
  } catch (err: any) {
    console.warn('[Staff] Doctor profile cleanup skipped:', err?.message || err);
  }
}
