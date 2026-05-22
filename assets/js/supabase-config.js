const SUPABASE_URL = 'https://lkvdmjostnfbhdirfapq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrdmRtam9zdG5mYmhkaXJmYXBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzODcxOTQsImV4cCI6MjA5NDk2MzE5NH0.Vn-01f170u66ShrboGDk9K8vB1MivfiMG4n6MolLkPU';

if (window.supabase) {
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
