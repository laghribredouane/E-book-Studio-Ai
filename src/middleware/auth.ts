import { NextFunction, Request, Response } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../lib/firebase-admin.ts';
import { getOrCreateProfile } from '../db/users.ts';

export interface ProfileRecord {
  id: string;
  uid: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
  plan: string;
  preferredLocale: string;
  isActive: boolean;
}

export interface AuthRequest extends Request {
  firebaseUser?: DecodedIdToken;
  profile?: ProfileRecord;
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentification requise.' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.firebaseUser = decodedToken;

    const profile = await getOrCreateProfile(
      decodedToken.uid,
      decodedToken.email || '',
      decodedToken.name,
      decodedToken.picture
    );

    if (!profile.isActive) {
      return res.status(403).json({ error: 'Ce compte a été suspendu par un administrateur.' });
    }

    req.profile = profile;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Session invalide ou expirée. Veuillez vous reconnecter.' });
  }
};

export const optionalAuth = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.firebaseUser = decodedToken;
    const profile = await getOrCreateProfile(
      decodedToken.uid,
      decodedToken.email || '',
      decodedToken.name,
      decodedToken.picture
    );
    if (profile.isActive) {
      req.profile = profile;
    }
  } catch {
    // Proceed unauthenticated for optional public routes
  }
  next();
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.profile) {
    return res.status(401).json({ error: 'Authentification requise.' });
  }
  if (req.profile.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
  }
  next();
};
