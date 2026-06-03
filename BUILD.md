# GymBuddy — APK build via GitHub Actions

Builds a sideloadable **debug APK** entirely on GitHub's runners. No EAS queue, no Expo Go.

---

## 1. Git repo — ALREADY DONE ✅

A clean standalone repo was created at the `gymbuddy` folder:
- `git init` + first commit (77 files) on branch `main`
- `.env`, `node_modules/`, `android/`, `ios/` excluded; assets + workflow included
- Independent of the `Documents/.git` repo → no submodule nesting

Nothing to do here. Just push it (step 1b).

### 1b. Create the GitHub repo + push
Create an **empty** repo on github.com (no README/gitignore), then from the project folder:

```powershell
cd "C:\Users\kalid\OneDrive\Documents\health\gymbuddy"
git remote add origin https://github.com/<your-username>/gymbuddy.git
git push -u origin main
```

> OneDrive note: cloud build is unaffected by OneDrive; only local builds can hit file locks.

---

## 2. Add GitHub secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**.
Add these 7 (values from your local `.env`):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_GROQ_KEY_1`
- `EXPO_PUBLIC_GROQ_KEY_2`
- `EXPO_PUBLIC_GROQ_KEY_3`
- `EXPO_PUBLIC_GROQ_KEY_4`
- `EXPO_PUBLIC_GROQ_KEY_5`

---

## 3. Run the build

GitHub → **Actions** tab → **Build Android APK** → **Run workflow** (or it runs on every push to `main`).

Takes ~8–15 min. When green, open the run → **Artifacts** → download **gymbuddy-apk** →
unzip → `app-debug.apk`.

---

## 4. Install on the Galaxy S25

Transfer `app-debug.apk` to the phone (USB / Drive / link) → tap it → allow
"install from unknown sources" → install. Done. Debug APKs install fine for personal use.

---

## Rebuild after code changes
Just `git push` (or re-run the workflow). New APK in Artifacts each time.
