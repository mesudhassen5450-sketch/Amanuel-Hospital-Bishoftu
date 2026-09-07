import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

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

        let isValidPassword = false;
        if (staff.passwordHash && (staff.passwordHash.startsWith('$2a$') || staff.passwordHash.startsWith('$2b$'))) {
            isValidPassword = await bcrypt.compare(password.trim(), staff.passwordHash);
        } else {
            isValidPassword = staff.passwordHash === password.trim();
        }

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
            process.env.JWT_SECRET || 'amanuel_hospital_secure_jwt_secret_2026_key',
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
