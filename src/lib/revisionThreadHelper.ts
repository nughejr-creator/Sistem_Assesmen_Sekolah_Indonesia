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

/**
 * Format catatan revisi (JSON threads atau plain text) menjadi tampilan teks yang bersih, rapi, dan mudah dibaca manusia.
 */
export function formatRevisionNotesForDisplay(rawNotes?: string | null): string {
  if (!rawNotes || !rawNotes.trim()) return '';
  const parsed = parseReviewThreads(rawNotes);
  
  if (parsed.threads && parsed.threads.length > 0) {
    const threadSummaries = parsed.threads.map(t => {
      const lastMsg = t.messages?.[t.messages.length - 1];
      const statusText = t.is_resolved ? ' (Disepakati)' : '';
      if (lastMsg) {
        return `• Butir #${t.item_number} [${lastMsg.sender_role === 'reviewer' ? 'Reviewer' : 'Penulis'}]: "${lastMsg.message}"${statusText}`;
      }
      return `• Butir #${t.item_number}${statusText}`;
    });

    if (parsed.generalNotes) {
      return `${parsed.generalNotes}\n\n${threadSummaries.join('\n')}`;
    }
    return threadSummaries.join('\n');
  }

  return parsed.generalNotes;
}

/**
 * Penggabungan aman dua revision_notes (misal antara Cloud dan Local Cache)
 * Menjamin tidak ada pesan obrolan yang hilang atau terhapus secara senyap.
 */
export function mergeRevisionNotes(notesA?: string | null, notesB?: string | null): string {
  if (!notesA && !notesB) return '';
  if (!notesA) return notesB || '';
  if (!notesB) return notesA || '';

  const parsedA = parseReviewThreads(notesA);
  const parsedB = parseReviewThreads(notesB);

  // Jika salah satu tidak punya threads, prioritaskan yang memiliki threads
  if (parsedA.threads.length === 0 && parsedB.threads.length > 0) return notesB;
  if (parsedB.threads.length === 0 && parsedA.threads.length > 0) return notesA;
  if (parsedA.threads.length === 0 && parsedB.threads.length === 0) {
    return parsedB.generalNotes || parsedA.generalNotes || '';
  }

  // Gabungkan threads
  const mergedThreads: ItemDiscussionThread[] = [...parsedA.threads];

  for (const tB of parsedB.threads) {
    const existingIndex = mergedThreads.findIndex(
      t => Number(t.item_number) === Number(tB.item_number) &&
           Number(t.variant_number || 1) === Number(tB.variant_number || 1)
    );

    if (existingIndex === -1) {
      mergedThreads.push(tB);
    } else {
      const tA = mergedThreads[existingIndex];
      // Gabungkan pesan dan hilangkan duplikasi berdasarkan id atau created_at+message
      const seenMsgKeys = new Set<string>();
      const combinedMessages: ItemDiscussionMessage[] = [];

      for (const msg of [...(tA.messages || []), ...(tB.messages || [])]) {
        const key = msg.id || `${msg.created_at}_${msg.message}_${msg.sender_name}`;
        if (!seenMsgKeys.has(key)) {
          seenMsgKeys.add(key);
          combinedMessages.push(msg);
        }
      }

      // Urutkan pesan berdasarkan waktu pembuatan (kronologis)
      combinedMessages.sort((m1, m2) => new Date(m1.created_at || 0).getTime() - new Date(m2.created_at || 0).getTime());

      mergedThreads[existingIndex] = {
        ...tA,
        ...tB,
        question_id: tB.question_id || tA.question_id,
        is_resolved: tB.is_resolved !== undefined ? tB.is_resolved : tA.is_resolved,
        messages: combinedMessages
      };
    }
  }

  const mergedGeneral = parsedB.generalNotes || parsedA.generalNotes || '';
  return serializeReviewThreads(mergedGeneral, mergedThreads);
}
