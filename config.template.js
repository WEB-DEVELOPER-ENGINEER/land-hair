// ==============================================
// Configuration Template
// ==============================================
// Copy this file's contents to update your credentials
// DO NOT commit actual credentials to Git!

// ==============================================
// STEP 1: Get these from Supabase Dashboard
// ==============================================
// 1. Go to: https://app.supabase.com
// 2. Select your project
// 3. Go to Settings (⚙️) > API
// 4. Copy the values below

const SUPABASE_CONFIG = {
    // Project URL (looks like: https://xxxxx.supabase.co)
    URL: 'YOUR_SUPABASE_URL',
    
    // anon/public key (starts with: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...)
    ANON_KEY: 'YOUR_SUPABASE_ANON_KEY'
};

// ==============================================
// STEP 2: Set your admin credentials
// ==============================================
// Change these to secure values for production!

const ADMIN_CONFIG = {
    // Admin email
    EMAIL: 'admin@admin.com',
    
    // Admin password (use a strong password!)
    PASSWORD: 'password123!'
};

// ==============================================
// STEP 3: Update the actual files
// ==============================================

/*
FILE 1: admin.html
Update the inline auth script credentials:

const ADMIN_EMAIL = 'admin@admin.com';
const ADMIN_PASSWORD = 'your-secure-password';

FILE 2: admin.js
Find lines 1-2 and replace with:

const SUPABASE_URL = '${SUPABASE_CONFIG.URL}';
const SUPABASE_ANON_KEY = '${SUPABASE_CONFIG.ANON_KEY}';


FILE 3: supabase-loader.js
Find lines 5-6 and replace with:

const SUPABASE_URL = '${SUPABASE_CONFIG.URL}';
const SUPABASE_ANON_KEY = '${SUPABASE_CONFIG.ANON_KEY}';
*/

// ==============================================
// STORAGE BUCKET NAME (usually don't need to change)
// ==============================================
const STORAGE_BUCKET = 'ihair-images';

// ==============================================
// EXAMPLE VALUES (for reference only)
// ==============================================
/*
EXAMPLE SUPABASE_URL:
'https://abcdefghijklmnop.supabase.co'

EXAMPLE SUPABASE_ANON_KEY:
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzOTQ4NjQwMCwiZXhwIjoxOTU1MDYyNDAwfQ.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'

STRONG PASSWORD EXAMPLE:
'MyS3cur3P@ssw0rd2024!'
*/

// ==============================================
// SECURITY NOTES
// ==============================================
/*
✅ DO:
- Use strong passwords (12+ chars, mixed case, numbers, symbols)
- Keep credentials private
- Use HTTPS in production
- Change default passwords before going live
- Rotate credentials periodically

❌ DON'T:
- Share credentials publicly
- Commit credentials to Git
- Use simple passwords like "password123"
- Reuse passwords from other sites
- Store credentials in plain text files
*/

// ==============================================
// TROUBLESHOOTING
// ==============================================
/*
Problem: "Unable to connect to Supabase"
Solution: Check URL and key are correct, no extra spaces

Problem: "Login failed"
Solution: Check admin credentials match what you're entering

Problem: "Storage bucket not found"
Solution: Create bucket named 'ihair-images' in Supabase Storage

Problem: "Upload fails"
Solution: Check bucket is set to public, verify credentials
*/

// ==============================================
// QUICK CHECKLIST
// ==============================================
/*
Before going live:

[ ] Created Supabase project
[ ] Created images table (SQL in SUPABASE_SETUP.md)
[ ] Created storage bucket (ihair-images)
[ ] Updated admin.js with Supabase credentials
[ ] Updated supabase-loader.js with Supabase credentials
[ ] Changed admin password in admin.js
[ ] Tested admin login
[ ] Tested image upload
[ ] Verified images load on landing page
[ ] Deployed to production
[ ] Tested production admin dashboard
[ ] Secured admin credentials
*/

// ==============================================
// DONE!
// ==============================================
// After updating credentials:
// 1. Save files
// 2. Test locally (open admin.html)
// 3. Deploy to production
// 4. Test live site

console.log('Configuration template loaded');
console.log('Follow the steps above to configure your credentials');
