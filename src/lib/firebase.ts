import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

export async function signInWithGooglePopup() {
  return await signInWithPopup(auth, googleAuthProvider);
}

export async function signInWithEmail(email: string, password: string) {
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmail(email: string, password: string, fullName: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (fullName.trim()) {
    await updateProfile(cred.user, { displayName: fullName.trim() });
  }
  try {
    await sendEmailVerification(cred.user);
  } catch {
    // Verification email optional if provider throttles
  }
  return cred;
}

export async function requestPasswordReset(email: string) {
  await sendPasswordResetEmail(auth, email);
}

export async function resendVerificationEmail() {
  if (auth.currentUser) {
    await sendEmailVerification(auth.currentUser);
  }
}

export async function logoutFirebase() {
  await signOut(auth);
}
