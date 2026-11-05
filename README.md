# Biyaheng Ligtas PWA

Deploy: push this folder to GitHub Pages (no build step). Replace `USERNAME` and `REPO` in the `og:` / `twitter:` tags of `index.html`.

## Natural voiceover (optional, recommended)
Browser speech sounds synthetic. For a natural voice, put `prayer-audio.opus` (and `prayer-audio.mp3` for older iPhones) in this folder, and the app unlocks **Natural Voiceover** by itself.

**Option A: generate with Google Cloud TTS (free tier: about 1M chars/month for Neural2)**
1. Create an API key for the Text-to-Speech API in Google Cloud Console.
2. `GOOGLE_TTS_API_KEY=your-key node generate-voice.js` (Node 18+)

This writes `prayer-audio.opus`, `prayer-audio.mp3` and `prayer-audio.json` (word timings, so the text follows the voice exactly). The key stays on your computer. Never put it in the app. If `fil-PH-Neural2-A` is not available to your project, the script falls back to `fil-PH-Wavenet-A`; set `VOICE=...` to try another.

**Option B: no code.** Use the Text-to-Speech preview in Google Cloud Console (language Filipino, voice Neural2-A, speed 0.88), download the MP3, and save it as `prayer-audio.mp3` here.

**Option C: in the app.** Open "Tunog at setting" and record a family voice, or load any audio file. Both are stored on that device only (IndexedDB).

After changing files on a deployed site, bump the cache name in `sw.js` so phones pick them up.
