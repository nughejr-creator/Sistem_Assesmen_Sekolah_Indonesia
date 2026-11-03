import { QuestionBankItem } from '../types/database';

/**
 * Helper terpadu untuk menentukan apakah butir soal sudah ditulis/dikerjakan oleh penulis.
 * Berlaku untuk semua penulis dan seluruh tipe format soal (Pilihan Ganda, Benar/Salah, Menjodohkan, Isian, Uraian):
 * - Status soal sudah 'Selesai' atau 'Menunggu Riviu'
 * - Memiliki teks pertanyaan (question_text)
 * - Memiliki stimulus teks (stimulus_text) atau media (stimulus_media_url)
 * - Memiliki opsi jawaban / pernyataan / pasangan menjodohkan (options)
 */
export function isQuestionWritten(q?: Partial<QuestionBankItem> | null): boolean {
  if (!q) return false;
  if (q.status === 'Selesai' || q.status === 'Menunggu Riviu') return true;
  if (q.question_text && q.question_text.trim().length > 0) return true;
  if (q.stimulus_text && q.stimulus_text.trim().length > 0) return true;
  if (q.stimulus_media_url && q.stimulus_media_url.trim().length > 0) return true;
  if (q.options && Array.isArray(q.options) && q.options.some(opt => 
    Boolean((opt.option_text && opt.option_text.trim().length > 0) || 
            (opt.matching_pair_text && opt.matching_pair_text.trim().length > 0) ||
            (opt.option_media_url && opt.option_media_url.trim().length > 0))
  )) return true;
  return false;
}
