import { Request, Response } from 'express';
import { prisma } from '../config/db.js';

/**
 * GET /api/doctors
 * Public endpoint: Retrieve all active doctors for public showcase
 */
export const getAllDoctors = async (req: Request, res: Response) => {
    try {
        // Fetch all staff accounts with role DOCTOR
        const doctorStaff = await prisma.staffAccount.findMany({
            where: {
                isActive: true,
                OR: [
                    { role: { equals: 'doctor', mode: 'insensitive' } },
                ],
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
            orderBy: {
                createdAt: 'asc',
            },
        });

        // Safely fetch doctor profiles for specialty, experience, and bio
        let doctorProfiles: any[] = [];
        try {
            doctorProfiles = await prisma.doctor.findMany({
                where: {
                    username: {
                        in: doctorStaff.map(s => s.username),
                    },
                },
                select: {
                    username: true,
                    specialty: true,
                    experience: true,
                    experienceYears: true,
                    consultationFee: true,
                    rating: true,
                    status: true,
                    bio: true,
                    isAvailable: true,
                },
                orderBy: {
                    // Preserve first-come, first-served insertion order
                    createdAt: 'asc',
                },
            });
        } catch (e: any) {
            console.warn('[Doctors Controller] Optional Doctor table query warning:', e.message);
        }

        const profileMap = new Map(doctorProfiles.map(p => [p.username.toLowerCase(), p]));

        // Map doctors into unified structure for frontend card grid
        const doctors = doctorStaff.map((staff, index) => {
            const photos = ['/doctor1.jpg', '/doctor2.jpg', '/doctor3.jpg'];
            const photo = photos[index % photos.length];
            const profile = profileMap.get(staff.username.toLowerCase());

            // Resolve experience string: prefer numeric experience_years, then legacy string
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
                consultationFee: profile?.consultationFee != null
                    ? Number(profile.consultationFee)
                    : null,
                rating: profile?.rating != null ? Number(profile.rating) : null,
                status: profile?.status ?? null,
                bio: profile?.bio || 'Dedicated medical specialist at Dr. Amanuel Hospital.',
                isOnline: Boolean(staff.isOnline),
                isAvailable: profile?.isAvailable ?? true,
                photo,
                lastSeen: staff.lastSeen,
            };
        });

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
