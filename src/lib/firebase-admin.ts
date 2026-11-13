import fs from 'node:fs';
import path from 'node:path';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function resolveProjectId(): string | undefined {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw) as { projectId?: string };
    if (parsed.projectId) return parsed.projectId;
  } catch {
    // Fallback to environment variables
  }
  return process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;
}

if (!getApps().length) {
  const projectId = resolveProjectId();
  initializeApp(projectId ? { projectId } : undefined);
}

export const adminAuth = getAuth();
