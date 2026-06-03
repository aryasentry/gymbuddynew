# GymBuddy — APK build via GitHub Actions

Builds a sideloadable **debug APK** entirely on GitHub's runners. No EAS queue, no Expo Go.

---

## 1. One clean git repo (fix submodule errors)

The "submodule" error happens when a folder you commit already contains its own `.git`
(git then stores it as a gitlink instead of the files). GymBuddy must be **one** repo,
rooted at the `gymbuddy` folder, with **no nested `.git`** inside and **not** committed
from a parent folder that is itself a repo.

Run these in PowerShell from the project folder:

```powershell
cd "C:\Users\kalid\OneDrive\Documents\health\gymbuddy"

# 1) List any nested .git repos (there should be NONE except the root one)
Get-ChildItem -Recurse -Force -Directory -Filter .git | Where-Object { $_.FullName -ne "$PWD\.git" } | Select-Object FullName

# 2) If the list above is non-empty, delete those nested .git folders, e.g.:
#    Remove-Item -Recurse -Force "path\shown\above\.git"

# 3) If git is broken / it was added as a submodule of a parent repo, reset cleanly:
Remove-Item -Recurse -Force .git   # ONLY if needed — wipes local history, not your code
git init
git add .
git commit -m "GymBuddy app"
git branch -M main
```

Then create an **empty** repo on GitHub (no README) and push:

```powershell
git remote add origin https://github.com/<your-username>/gymbuddy.git
git push -u origin main
```

`node_modules/`, `android/`, `ios/`, and `.env` are git-ignored — they will NOT be pushed
(the workflow regenerates `android/` and recreates `.env` from secrets).

> OneDrive note: building locally inside a OneDrive-synced folder can cause file-lock issues.
> The GitHub Actions build is unaffected (it runs in the cloud).

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
