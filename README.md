## 💻 Local Development

### Prerequisites
- Node.js (v18+)
- npm
- [Vercel CLI](https://vercel.com/docs/cli) for testing API routes locally

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/scuthetatau/scuthetatau.github.io.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Install and sign in to the Vercel CLI:
   ```bash
   npm i -g vercel
   vercel login
   ```
4. Link the project to your local checkout:
   ```bash
   vercel link
   ```
5. Pull down the project environment variables from Vercel:
   ```bash
   vercel env pull
   ```
6. Create or update a `.env` file in the root directory with your Firebase configuration:
   ```env
   REACT_APP_FIREBASE_API_KEY=your_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_domain
   REACT_APP_FIREBASE_PROJECT_ID=your_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_bucket
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_id
   REACT_APP_FIREBASE_APP_ID=your_id
   ```
7. Start the app locally:
   ```bash
   npm start
   ```

### Testing API Routes Locally
If you need to test API routes, serverless functions, or Vercel-specific behavior, use:
bash `vercel dev`


This runs your app in a Vercel-like local environment and is the preferred way to verify API changes before deploying.

### Available Scripts
- `npm start`: Runs the app in development mode.
- `npm run build`: Bundles the app for production.
- `vercel dev`: Runs the project locally with Vercel's runtime for API testing.
- `vercel deploy`: Deploys the project through the Vercel CLI.

---

## 📦 Deployment & Maintenance

The site is configured for automated deployment via **Vercel**.
Log in using the Theta Tau Vercel account to make changes there as needed.

For Vercel CLI workflows:
- Use `vercel login` before running CLI commands.
- Use `vercel link` once per local checkout to connect it to the correct Vercel project.
- Use `vercel env pull` to sync environment variables locally.
- Use `vercel dev` whenever you need to test API-related changes.

Ensure all changes are committed and pushed to `main`.