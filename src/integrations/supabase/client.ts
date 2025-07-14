import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = 'https://hrjjlipfhaeqovqkzmoq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyampsaXBmaGFlcW92cWt6bW9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjUzMDYsImV4cCI6MjA2Nzk0MTMwNn0.Jy-eyllma5mwf4FCC2krJXAxBtGhAAiGS4AaUG4N8eg';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);