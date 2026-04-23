import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://iahytcrmstlkvnmwfxgs.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhaHl0Y3Jtc3Rsa3ZubXdmeGdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1OTA5MDYsImV4cCI6MjA5MjE2NjkwNn0.ipaXOyv2mGTZMPJrqqkFVu_qnNhvWlm9-PZJqxu2XUw'
);