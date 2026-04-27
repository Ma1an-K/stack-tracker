import { useEffect } from 'react';

interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  noIndex?: boolean;
  jsonLd?: Record<string, unknown>;
}

const HOME_TITLE = 'Stack Tracker – Poker Homegame Manager & Session Tracker';
const HOME_DESCRIPTION = 'Stack Tracker is the all-in-one poker homegame manager. Track sessions, settle debts, view leaderboards and player stats for your home poker nights.';
const HOME_CANONICAL = 'https://www.stack-tracker.com/';
const HOME_OG = 'https://www.stack-tracker.com/og-image.png';

function setMetaByName(name: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setMetaByProperty(property: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function setJsonLd(id: string, data: Record<string, unknown> | undefined) {
  const existing = document.head.querySelector(`script[data-page-jsonld="${id}"]`);
  if (existing) existing.remove();
  if (!data) return;
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.dataset.pageJsonld = id;
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

export function usePageMeta(meta: PageMeta) {
  useEffect(() => {
    document.title = meta.title;
    setMetaByName('description', meta.description);
    setMetaByName('robots', meta.noIndex ? 'noindex, nofollow' : 'index, follow');
    setCanonical(meta.canonical);

    setMetaByProperty('og:title', meta.title);
    setMetaByProperty('og:description', meta.description);
    setMetaByProperty('og:url', meta.canonical);
    setMetaByProperty('og:image', meta.ogImage ?? HOME_OG);

    setMetaByName('twitter:title', meta.title);
    setMetaByName('twitter:description', meta.description);
    setMetaByName('twitter:image', meta.ogImage ?? HOME_OG);

    setJsonLd('page', meta.jsonLd);

    return () => {
      document.title = HOME_TITLE;
      setMetaByName('description', HOME_DESCRIPTION);
      setMetaByName('robots', 'index, follow');
      setCanonical(HOME_CANONICAL);
      setMetaByProperty('og:title', HOME_TITLE);
      setMetaByProperty('og:description', HOME_DESCRIPTION);
      setMetaByProperty('og:url', HOME_CANONICAL);
      setMetaByProperty('og:image', HOME_OG);
      setMetaByName('twitter:title', HOME_TITLE);
      setMetaByName('twitter:description', HOME_DESCRIPTION);
      setMetaByName('twitter:image', HOME_OG);
      setJsonLd('page', undefined);
    };
  }, [meta.title, meta.description, meta.canonical, meta.ogImage, meta.noIndex, meta.jsonLd]);
}
