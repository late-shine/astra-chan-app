# Astra-chan V1 account setup

The code keeps Firebase anonymous sign-in for multiplayer and lets a user upgrade that same anonymous identity to an email/password or Google account. This preserves the user's existing UID and friend code when the provider can be linked to the anonymous identity.

## Firebase Console steps

1. Open the existing Firebase project.
2. Go to **Authentication → Sign-in method**.
3. Enable **Email/Password** and **Google** and save. Email-link sign-in is not required for this version.
4. Go to **Project settings → General → Your apps** and open the existing Web app configuration.
5. Copy these values into the local app `.env` using the `VITE_FIREBASE_*` names in `.env.example`:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `databaseURL`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`
6. Go to **Realtime Database → Rules** and add the `userProgress/$uid` block from `database.rules.json`. Keep the existing authentication and ownership rules unchanged.
7. Publish the rules.

Firebase's built-in password-reset email is used for email/password accounts. Customize its subject, wording, and language from **Authentication → Templates → Password reset**. Google accounts do not need a password-reset flow because Google manages their credentials.

## Gemini Text-to-Speech steps

The app's fixed Astra voice catalog uses the server-side Gemini API key already used for kanji feedback. Browser voices continue to work if Gemini TTS is unavailable or its free-tier quota is reached.

1. Open [Google AI Studio](https://aistudio.google.com/) and create or use a Gemini API key.
2. Add it as `GEMINI_API_KEY` in the local `.env` file and in the Vercel production environment variables.
3. Optionally set `GEMINI_TTS_MODEL=gemini-2.5-flash-preview-tts`. This is already the default.
4. Keep the key server-side. Do not rename it with a `VITE_` prefix and do not place it in client-side code.

Gemini TTS is a Preview capability and its exact free-tier availability and limits are controlled by the Gemini API project. If the selected model is unavailable or reaches quota, the app falls back to the browser voice instead of blocking pronunciation practice.

## Local test flow

1. Start the app with `npm run dev`.
2. Use the visible **Sign in** account shortcut, or open Profile.
3. Test either **Continue with Google** or create an account using an email and a password of at least six characters.
4. Confirm the UI shows **Sync active**.
5. Change a small piece of progress, reload, and confirm it remains.
6. Open the app in another browser, sign in with the same account, and confirm the cloud progress loads.
7. For email/password accounts, switch to **Sign in**, choose **Forgot password?**, request a reset link, and complete the password change from the email.
8. Open Profile → voice settings, choose **Astra · Gemini**, select a voice, and preview it. Then temporarily remove the server key and confirm the browser fallback still speaks.

Do not commit `.env` or share Firebase secrets. The Firebase web configuration is safe to expose in a client app, but the Gemini server key must remain server-side.
