import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tvrogbemtzdhcqjvfvdj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2cm9nYmVtdHpkaGNxanZmdmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NTYzNTIsImV4cCI6MjEwNDUzMjM1Mn0.z0vwH9xwyBHWo8ea5GbNx1XHAHXF3ApwBpqfbqiF9aM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
