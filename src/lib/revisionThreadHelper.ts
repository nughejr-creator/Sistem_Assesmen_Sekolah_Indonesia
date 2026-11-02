import { QuestionWriterAssignment } from '../types/database';

export interface ItemDiscussionMessage {
  id: string;
  sender_id?: string;
  sender_name: string;
  sender_role: 'reviewer' | 'teacher';
  message: string;
  created_at: string;
}

export interface ItemDiscussionThread {
  item_number: number;
  variant_number?: number;
  question_id?: string;
  messages: ItemDiscussionMessage[];
  is_resolved?: boolean;
}

export interface ParsedRevisionData {
  generalNotes: string;
  threads: ItemDiscussionThread[];
}

/**
 * Parsing aman dan backward-compatible untuk revision_notes
 */
export function parseReviewThreads(rawNotes?: string | null): ParsedRevisionData {
  if (!rawNotes || !rawNotes.trim()) {
    return { generalNotes: '', threads: [] };
  }

  const trimmed = rawNotes.trim();

  // Cek apakah format JSON terstruktur
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return { generalNotes: '', threads: parsed };
      }
      return {
        generalNotes: typeof parsed.general_notes === 'string' ? parsed.general_notes : '',
        threads: Array.isArray(parsed.threads) ? parsed.threads : []
      };
    } catch {
      // Abaikan error parse dan fallback ke plain text
    }
  }

  // Fallback: Jika catatan lama berupa string polos biasa
  return { generalNotes: trimmed, threads: [] };
}

/**
 * Serialisasi threads dan general notes kembali ke format JSON string yang aman
 */
export function serializeReviewThreads(generalNotes: string, threads: ItemDiscussionThread[]): string {
  const cleanThreads = threads.filter(t => t.messages && t.messages.length > 0);
  const cleanGeneral = (generalNotes || '').trim();

  if (cleanThreads.length === 0 && !cleanGeneral) {
    return '';
  }

  return JSON.stringify({
    general_notes: cleanGeneral,
    threads: cleanThreads
  });
}

/**
 * Ambil thread percakapan untuk butir soal dan varian tertentu
 */
export function getThreadForItem(
  threads: ItemDiscussionThread[],
  itemNumber: number,
  variantNumber: number = 1
): ItemDiscussionThread | undefined {
  return threads.find(
    t => Number(t.item_number) === Number(itemNumber) && 
         (variantNumber === undefined || Number(t.variant_number || 1) === Number(variantNumber))
  );
}

/**
 * Hitung jumlah pesan aktif (yang belum resolved) untuk nomor butir tertentu
 */
export function getItemUnresolvedMessageCount(
  threads: ItemDiscussionThread[],
  itemNumber: number,
  variantNumber: number = 1
): number {
  const thread = getThreadForItem(threads, itemNumber, variantNumber);
  if (!thread || thread.is_resolved) return 0;
  return thread.messages?.length || 0;
}
