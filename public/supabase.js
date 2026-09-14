/**
 * Department of Zoology — Banaras Hindu University
 * Supabase Client Configuration & Initialization
 * 
 * Hosting: GitHub Pages
 * Backend: Supabase
 */

// Supabase Environment Constants
// Configurable via window.ENV_SUPABASE_URL / window.ENV_SUPABASE_ANON_KEY or direct replacement
const SUPABASE_URL = (typeof window !== 'undefined' && window.ENV_SUPABASE_URL) 
  ? window.ENV_SUPABASE_URL 
  : "https://twdthldxzfbblepjjype.supabase.co";

const SUPABASE_ANON_KEY = (typeof window !== 'undefined' && window.ENV_SUPABASE_ANON_KEY) 
  ? window.ENV_SUPABASE_ANON_KEY 
  : "sb_publishable_a9VJpB_fDJgyXBSxskwZaA_giYAMLCC";

// Bucket & Table Constants
const SUPABASE_STORAGE_BUCKET = "study-materials";
const SUPABASE_MATERIALS_TABLE = "materials";

// Initialize Supabase Client ONLY ONCE (Singleton)
let supabase = null;

function getSupabaseClient() {
  if (supabase) {
    return supabase;
  }

  if (typeof window !== 'undefined' && window.supabaseClient) {
    supabase = window.supabaseClient;
    return supabase;
  }

  if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
    try {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      window.supabaseClient = supabase;
      return supabase;
    } catch (err) {
      console.error("Failed to initialize Supabase client:", err);
      return null;
    }
  }

  console.warn("Supabase SDK is not loaded on window.supabase.");
  return null;
}

// Auto-initialize if SDK is available
supabase = getSupabaseClient();

// Expose single instance globally for GitHub Pages scripts
if (typeof window !== 'undefined') {
  window.SUPABASE_URL = SUPABASE_URL;
  window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
  window.SUPABASE_STORAGE_BUCKET = SUPABASE_STORAGE_BUCKET;
  window.SUPABASE_MATERIALS_TABLE = SUPABASE_MATERIALS_TABLE;
  window.supabaseClient = supabase;
}
