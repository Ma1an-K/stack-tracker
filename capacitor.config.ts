import type { CapacitorConfig } from '@capacitor/cli';

// The iOS/Android apps bundle the built web app from dist/ and talk to the
// same Supabase project as the website.
const config: CapacitorConfig = {
  // Permanent once the app is first submitted to either store.
  appId: 'com.stacktracker.app',
  appName: 'Stack Tracker',
  webDir: 'dist',
  backgroundColor: '#0b0a08',
  ios: {
    contentInset: 'never',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: '#0b0a08',
      showSpinner: false,
    },
  },
};

export default config;
