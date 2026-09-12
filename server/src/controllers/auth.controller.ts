import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { JWT_SECRET } from '../utils/auth.js';

async function passwordsMatch(plain: string, storedHash: string | null | undefined): Promise<boolean> {
    const password = plain.trim();
    const hash = storedHash?.trim() ?? '';
    if (!password || !hash) return false;

    if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
        try {
            if (await bcrypt.compare(password, hash)) return true;
        } catch {
            // bcryptjs cannot always verify pgcrypto hashes; try SQL crypt next
        }

        try {
            const rows = await prisma.$queryRaw<Array<{ ok: boolean }>>`
                SELECT (crypt(${password}, ${hash}) = ${hash}) AS ok
            `;
            if (rows[0]?.ok) return true;
        } catch {
            // pgcrypto may be unavailable
        }

        return false;
    }

    return hash === password;
}

export const login = async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    try {
        const cleanUsername = username.trim();

        const staff = await prisma.staffAccount.findFirst({
            where: {
                username: {
                    equals: cleanUsername,
                    mode: 'insensitive'
                }
            }
        });

        if (!staff) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const isValidPassword = await passwordsMatch(password, staff.passwordHash);

        if (!isValidPassword) {
            return res.status(401).json({ success: false, message: 'Invalid username or password', error: 'Invalid username or password' });
        }

        if (staff.isActive === false) {
            return res.status(403).json({ error: 'Account is deactivated. Contact administrator.' });
        }

        const token = jwt.sign(
            { 
                id: staff.id.toString(), 
                username: staff.username, 
                role: (staff.role || 'ADMIN').toUpperCase() 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        await prisma.staffAccount.update({
            where: { id: staff.id },
            data: { lastLogin: new Date(), isOnline: true }
        }).catch(err => console.error('Non-critical lastLogin update error:', err.message));

        return res.json({
            success: true,
            token,
            user: {
                id: staff.id.toString(),
                username: staff.username,
                role: staff.role,
                displayName: staff.displayName || staff.username
            }
        });
    } catch (error: any) {
        console.error('Login controller fatal error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error during login' });
    }
};

export const getCurrentUser = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Not authenticated.' });
        }

        const staff = await prisma.staffAccount.findFirst({
            where: { username: req.user.username },
            select: {
                id: true,
                username: true,
                displayName: true,
                role: true,
                isActive: true,
                isOnline: true,
                lastLogin: true,
            },
        });

        if (!staff) {
            return res.status(404).json({ success: false, message: 'Staff account not found.' });
        }

        return res.json({ 
            success: true, 
            user: {
                ...staff,
                id: staff.id.toString()
            } 
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
