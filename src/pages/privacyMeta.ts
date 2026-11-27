// Shared by the privacy page and the build-time prerender.
export const PRIVACY_TITLE = 'Privacy Policy – Stack Tracker';
export const PRIVACY_DESCRIPTION =
  'What Stack Tracker collects, why, who it is shared with, and how to delete your account and data.';
export const PRIVACY_CANONICAL = 'https://www.stack-tracker.com/privacy';
export const PRIVACY_CONTACT = 'matan@ormada.com.au';
export const PRIVACY_UPDATED = '27 November 2026';

export const PRIVACY_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  url: PRIVACY_CANONICAL,
  name: PRIVACY_TITLE,
  description: PRIVACY_DESCRIPTION,
  isPartOf: {
    '@type': 'WebSite',
    name: 'Stack Tracker',
    url: 'https://www.stack-tracker.com/',
  },
};
