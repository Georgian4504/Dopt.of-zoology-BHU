/**
 * Department of Zoology — Banaras Hindu University
 * Academic Resource Repository Types & Supabase Database Schemas
 */

/**
 * Exact payload schema for inserting into the Supabase `materials` table.
 * Strictly includes ONLY columns that exist in the database schema cache.
 * DO NOT include unmapped properties like 'subject', 'uploader_name', 'file_path', 'public_url', etc.
 */
export interface MaterialInsertPayload {
  id: string;
  title: string;
  paper: string;       // Paper Code, e.g. "ZOM 101" (NOT 'subject')
  semester: string;    // Semester key, e.g. "sem1"
  topic: string;       // Syllabus topic, e.g. "Protozoa", "Mammalian Physiology"
  type: string;        // Material category, e.g. "PDF", "Class Notes", "Specimen Photo"
  student: string;     // Scholar Name / Roll No (NOT 'uploader_name')
  date: string;        // Submission date string, e.g. "2026-09-14"
  description: string; // Academic summary or notes
  file: string;        // Public URL to the uploaded file in Supabase Storage
  image: string;       // Image/thumbnail URL (or empty string if document)
  views: number;       // View counter, initialized to 0
  likes: number;       // Like counter, initialized to 0
  created_at?: string; // Optional ISO timestamp, defaults to now() in PostgreSQL
}

/**
 * Database record structure as stored and returned by Supabase PostgREST
 */
export interface DatabaseMaterialRow {
  id: string;
  title: string;
  paper: string;
  semester: string;
  topic: string;
  type: string;
  student: string;
  date: string;
  description: string;
  file: string;
  image: string;
  views: number;
  likes: number;
  created_at: string;

  // Optional columns that may exist in extended schemas
  file_path?: string | null;
  file_size?: number | null;
  file_type?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  public_url?: string | null;
  mime_type?: string | null;

  // Frontend compatibility aliases (computed on load)
  subject?: string;
  uploader_name?: string;
}

/**
 * Normalized representation used in UI components and bookshelf rendering
 */
export interface StudyMaterial {
  id: string;
  title: string;
  paper: string;
  subject?: string;
  semester: string;
  topic: string;
  type: string;
  student: string;
  uploader_name?: string;
  date: string;
  description: string;
  file: string;
  image: string;
  views: number;
  likes: number;
  created_at?: string;
}

/**
 * Syllabus paper structure
 */
export interface SyllabusPaper {
  code: string;
  name: string;
  type: 'Theory' | 'Practical' | 'Special Paper' | 'Core';
  topics: string[];
}

/**
 * Semester organization structure
 */
export interface SemesterData {
  id: string;
  roman: string;
  name: string;
  papers: SyllabusPaper[];
}

/**
 * Visitor counter record structure
 */
export interface VisitorRecord {
  id?: number;
  session_id: string;
  visited_at?: string;
}
