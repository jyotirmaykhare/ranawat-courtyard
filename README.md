# Ranawat Courtyard replica

Responsive, dependency-free website inspired by the live Ranawat Courtyard reference and the supplied development prompt. This is a standalone copy, separate from the original workspace.

## Run locally

Requires Node.js 18 or later. From this folder:

```sh
npm start
```

Open `http://localhost:4173`. The included server serves the app shell for all nine routes so direct links and refreshes work. On Windows, double-click `start-local.cmd` to start the server and open the site. Close the “Ranawat Heritage local server” console window to stop it.

## Deploy to Vercel

1. Create a Git repository from this folder and push it to GitHub, GitLab or Bitbucket.
2. Import the repository in Vercel and keep the detected project root as this folder.
3. Use the included build command (`npm run build`) and output directory (`public`) from `vercel.json`.
4. Set `SITE_URL` in Vercel Project Settings → Environment Variables to the production domain you assign, for example `https://ranawat-heritage.vercel.app`, then redeploy. The build uses it to produce the sitemap and robots file; page canonical URLs use the active domain.

No Vercel account credentials are needed for local development. Deployment itself requires connecting this project to a Vercel account.

## Included

- Nine responsive routes with shared navigation, footer, contact details and per-route title/description metadata.
- Six boutique collections and 18 enquiry-led sample pieces, with working category filters and product detail dialogs.
- A filtered gallery using the photographs supplied with the original Ranawat site.
- Wedding, farmhouse stay and contact enquiry forms that validate fields and prepare WhatsApp messages.
- LocalBusiness structured data, sitemap and robots files.

## Photography

The image files in `public/images` are the assets served by the original Ranawat Courtyard site and are used across the replica. The home hero uses the 3-second cinematic push-in stored in `media/`; the clip is a camera move over the supplied hero image. Its playback starts when the hero scrolls into view and stops when it leaves the viewport.

The original image bundle is retained under `archive/illustrative-reference-assets` as a backup copy. Add new approved photographs to `public/images` and update the `imageFiles` map in `app.js` when introducing new image keys.

## Configuration

Business phone and address are centralized at the top of `app.js`. The static implementation needs no credentials or backend. Forms open WhatsApp with the entered enquiry details; they do not store submissions, confirm bookings, show live availability or process payments.
# ranawat-courtyard
