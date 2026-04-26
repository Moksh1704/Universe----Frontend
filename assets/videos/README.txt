PLACE YOUR INTRO VIDEO HERE
============================

File name required:  intro.mp4
Full path:           assets/videos/intro.mp4

VIDEO REQUIREMENTS
──────────────────
Format     : MP4 (H.264 video + AAC audio)
Orientation: Portrait  (1080 × 1920 recommended)
Duration   : 5–15 seconds  (only first ~5 s are used before navigation)
File size  : Keep under 25 MB for fast bundle loading
Frame rate : 24–30 fps

HOW THE VIDEO IS USED
─────────────────────
1. Fills the screen fullscreen (resizeMode: 'cover'), muted, autoplay
2. At ~2.4 s → dark overlay fades in  (max opacity 0.32)
3. At ~2.7 s → blur layer fades in    (expo-blur, intensity 14)
4. At ~3.1 s → logo fades + scales in from centre
5. At ~3.7 s → "UniVerse" text + tagline fade in
6. At ~4.9 s → screen cross-fades to the Get Started screen

GRACEFUL FALLBACK
─────────────────
If intro.mp4 is MISSING or fails to load, the app automatically uses
a dark-navy gradient background and runs the same animation sequence
on a shorter timeline (total ~3 s) before showing the Get Started screen.

The existing Get Started screen is NEVER modified by the intro system.
