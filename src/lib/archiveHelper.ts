import { supabase } from './supabase';
import { safeSupabaseUpsert } from './syncHelper';
import { Blueprint, ExamPackage, QuestionWriterAssignment, ExamSession } from '../types/database';

export const ARCHIVE_PREFIX = '[ARSIP] ';

// ==========================================
// 1. BLUEPRINTS (KISI-KISI)
// ==========================================
export const isBlueprintArchived = (bp: Partial<Blueprint> | null | undefined): boolean => {
  if (!bp) return false;
  if (bp.is_archived) return true;
  if (typeof bp.title === 'string' && bp.title.startsWith(ARCHIVE_PREFIX)) return true;
  return false;
};

export const getCleanBlueprintTitle = (title: string = ''): string => {
  return (title || '').replace(/^\[ARSIP\]\s*/i, '').trim();
};

export const archiveBlueprintInDb = async (bpId: string, currentTitle: string): Promise<boolean> => {
  const cleanTitle = getCleanBlueprintTitle(currentTitle);
  const newTitle = `${ARCHIVE_PREFIX}${cleanTitle}`;
  try {
    const { error } = await supabase
      .from('blueprints')
      .update({
        title: newTitle,
        updated_at: new Date().toISOString()
      })
      .eq('id', bpId);
    return !error;
  } catch (err) {
    console.error('Error archiving blueprint:', err);
    return false;
  }
};

export const restoreBlueprintInDb = async (bpId: string, currentTitle: string): Promise<boolean> => {
  const cleanTitle = getCleanBlueprintTitle(currentTitle);
  try {
    const { error } = await supabase
      .from('blueprints')
      .update({
        title: cleanTitle,
        updated_at: new Date().toISOString()
      })
      .eq('id', bpId);
    return !error;
  } catch (err) {
    console.error('Error restoring blueprint:', err);
    return false;
  }
};

// ==========================================
// 2. EXAM PACKAGES (PAKET UJIAN)
// ==========================================
export const isPackageArchived = (pkg: Partial<ExamPackage> | null | undefined): boolean => {
  if (!pkg) return false;
  if (pkg.is_archived) return true;
  if (typeof pkg.title === 'string' && pkg.title.startsWith(ARCHIVE_PREFIX)) return true;
  return false;
};

export const getCleanPackageTitle = (title: string = ''): string => {
  return (title || '').replace(/^\[ARSIP\]\s*/i, '').trim();
};

export const archivePackageInDb = async (packageId: string, currentTitle: string): Promise<boolean> => {
  const cleanTitle = getCleanPackageTitle(currentTitle);
  const newTitle = `${ARCHIVE_PREFIX}${cleanTitle}`;
  try {
    const { error } = await supabase
      .from('exam_packages')
      .update({
        title: newTitle,
        updated_at: new Date().toISOString()
      })
      .eq('id', packageId);
    return !error;
  } catch (err) {
    console.error('Error archiving exam package:', err);
    return false;
  }
};

export const restorePackageInDb = async (packageId: string, currentTitle: string): Promise<boolean> => {
  const cleanTitle = getCleanPackageTitle(currentTitle);
  try {
    const { error } = await supabase
      .from('exam_packages')
      .update({
        title: cleanTitle,
        updated_at: new Date().toISOString()
      })
      .eq('id', packageId);
    return !error;
  } catch (err) {
    console.error('Error restoring exam package:', err);
    return false;
  }
};

// ==========================================
// 3. WRITER ASSIGNMENTS (PENUGASAN PENULIS)
// ==========================================
export const isAssignmentArchived = (asg: Partial<QuestionWriterAssignment> | null | undefined): boolean => {
  if (!asg) return false;
  return Boolean(asg.is_archived || asg.status === 'Diarsipkan');
};

// ==========================================
// 4. EXAM SESSIONS (SESI UJIAN & TOKEN CBT)
// ==========================================
export const isSessionArchived = (s: Partial<ExamSession> | null | undefined): boolean => {
  if (!s) return false;
  if (s.is_archived) return true;
  if (typeof s.session_name === 'string' && s.session_name.startsWith(ARCHIVE_PREFIX)) return true;
  return false;
};

export const getCleanSessionName = (name: string = ''): string => {
  return (name || '').replace(/^\[ARSIP\]\s*/i, '').trim();
};

export const archiveSessionInDb = async (tokenCode: string, currentName: string): Promise<boolean> => {
  const cleanName = getCleanSessionName(currentName);
  const newName = `${ARCHIVE_PREFIX}${cleanName}`;
  try {
    const { error } = await supabase
      .from('exam_sessions')
      .update({
        session_name: newName,
        is_active: false
      })
      .eq('token_code', tokenCode);
    return !error;
  } catch (err) {
    console.error('Error archiving exam session:', err);
    return false;
  }
};

export const restoreSessionInDb = async (tokenCode: string, currentName: string): Promise<boolean> => {
  const cleanName = getCleanSessionName(currentName);
  try {
    const { error } = await supabase
      .from('exam_sessions')
      .update({
        session_name: cleanName
      })
      .eq('token_code', tokenCode);
    return !error;
  } catch (err) {
    console.error('Error restoring exam session:', err);
    return false;
  }
};
