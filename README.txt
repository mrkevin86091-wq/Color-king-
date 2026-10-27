COLOR KING — Login/Register + Backend Starter (Demo Only)

WHAT'S INCLUDED
- Mobile-friendly login/register page
- Node.js + Express backend
- SQLite database for user accounts and virtual coin balance
- Password hashing with bcrypt
- Session cookie flags and rate limiting on authentication endpoints
- No payment processing, deposits, withdrawals, or real-money prizes

IMPORTANT LIMITS
This is a starter prototype, not a production-ready financial or gaming platform.
The default Express MemoryStore is not suitable for production deployment, and SQLite file persistence depends on the host. Use a persistent session store and durable database before public production use. Add email verification, password reset, CSRF protection, backups, monitoring, and independent security review. Do not store payment card or UPI credentials.
Before adding any real-money functionality, get qualified legal/compliance advice for the applicable jurisdiction.

RUN LOCALLY
1. Install Node.js 20 or newer on a computer or coding environment.
2. Extract this ZIP.
3. In the project folder, run: npm install
4. Set SESSION_SECRET to a random string of at least 32 characters.
   Linux/macOS example:
   SESSION_SECRET='a-long-random-secret-string-at-least-32-chars' npm start
   Windows PowerShell example:
   $env:SESSION_SECRET='a-long-random-secret-string-at-least-32-chars'; npm start
5. Open http://localhost:3000

This backend requires a Node.js host. A static file host such as Netlify Drop alone cannot run server.js or its database. For deployment, choose a host that supports Node.js and persistent storage, then set environment variables securely.
