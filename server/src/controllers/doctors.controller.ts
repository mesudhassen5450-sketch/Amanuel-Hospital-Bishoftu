import { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { isEffectivelyOnline } from '../utils/onlineStatus.js';
import { loadDoctorProfileMap } from '../utils/doctorProfile.js';

/**
 * GET /api/doctors
 * Public endpoint: active doctors for the public doctors page.
 * Specialty/bio/experience come from the doctors table joined by username
 * (same rows Admin create/edit writes through Express).
 */
export const getAllDoctors = async (_req: Request, res: Response) => {
    try {
        const doctorStaff = await prisma.staffAccount.findMany({
            where: {
                isActive: true,
                OR: [{ role: { equals: 'doctor', mode: 'insensitive' } }],
            },
            select: {
                id: true,
                username: true,
                displayName: true,
                isActive: true,
                isOnline: true,
                lastSeen: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
        });

        const profileMap = await loadDoctorProfileMap(prisma);
        const nowMs = Date.now();
        const staleOnlineIds: bigint[] = [];

        const doctors = doctorStaff.map((staff, index) => {
            const photos = ['/doctor1.jpg', '/doctor2.jpg', '/doctor3.jpg'];
            const photo = photos[index % photos.length];
            const profile = profileMap.get(staff.username.toLowerCase());
            const online = isEffectivelyOnline(staff.isOnline, staff.lastSeen, nowMs);
            if (staff.isOnline && !online) {
                staleOnlineIds.push(staff.id);
            }

            const rawExpYears = profile?.experienceYears;
            const rawExpLegacy = profile?.experience;
            let experience: string;
            if (rawExpYears != null) {
                experience = `${rawExpYears}+ years experience`;
            } else if (rawExpLegacy) {
                experience = rawExpLegacy.toLowerCase().includes('year')
                    ? rawExpLegacy
                    : `${rawExpLegacy} years experience`;
            } else {
                experience = '5+ years experience';
            }

            return {
                id: staff.id.toString(),
                username: staff.username,
                name: staff.displayName || staff.username,
                specialty: profile?.specialty || 'General Practice',
                experienceYears: rawExpYears ?? null,
                experience,
                consultationFee:
                    profile?.consultationFee != null ? Number(profile.consultationFee) : null,
                rating: profile?.rating != null ? Number(profile.rating) : null,
                status: profile?.status ?? null,
                bio: profile?.bio || 'Dedicated medical specialist at Dr. Amanuel Hospital.',
                isOnline: online,
                isAvailable: profile?.isAvailable ?? true,
                photo,
                lastSeen: staff.lastSeen,
            };
        });

        if (staleOnlineIds.length > 0) {
            prisma.staffAccount
                .updateMany({
                    where: { id: { in: staleOnlineIds } },
                    data: { isOnline: false },
                })
                .catch((err: any) =>
                    console.warn('[Doctors Controller] Stale online cleanup skipped:', err?.message)
                );
        }

        return res.json({
            success: true,
            doctors,
            count: doctors.length,
        });
    } catch (error: any) {
        console.error('[Doctors Controller] Get doctors error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch doctors',
        });
    }
};
