import { StaticRouter } from 'react-router-dom/server';
import { Routes, Route } from 'react-router-dom';
import { renderToString } from 'react-dom/server';
import { PublicSettlementPage } from './pages/PublicSettlementPage';
import { PublicHandCalculatorPage } from './pages/PublicHandCalculatorPage';
import { AboutPage } from './pages/AboutPage';

export interface PageMetaForBuild {
  title: string;
  description: string;
  canonical: string;
  jsonLd: Record<string, unknown>;
}

const SETTLEMENT_META: PageMetaForBuild = {
  title: 'Poker Settlement Calculator – Free, No Signup | Stack Tracker',
  description:
    "Free poker settlement calculator. Enter each player's buy-ins and cash-outs and get the minimum number of payments to settle your home game. No signup required.",
  canonical: 'https://www.stack-tracker.com/poker-settlement-calculator',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Poker Settlement Calculator',
    url: 'https://www.stack-tracker.com/poker-settlement-calculator',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    description:
      "Free poker settlement calculator. Enter each player's buy-ins and cash-outs and get the minimum number of payments to settle your home game. No signup required.",
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    isPartOf: {
      '@type': 'WebSite',
      name: 'Stack Tracker',
      url: 'https://www.stack-tracker.com/',
    },
  },
};

const HAND_CALC_META: PageMetaForBuild = {
  title: "Poker Hand Calculator – Hold'em, Omaha, Sidepots | Stack Tracker",
  description:
    "Free poker hand calculator. Enter hole cards and the board to determine winners, sidepots and run-it-twice payouts for Texas Hold'em and Omaha. No signup.",
  canonical: 'https://www.stack-tracker.com/poker-hand-calculator',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Poker Hand Calculator',
    url: 'https://www.stack-tracker.com/poker-hand-calculator',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Web',
    description:
      "Free poker hand calculator. Enter hole cards and the board to determine winners, sidepots and run-it-twice payouts for Texas Hold'em and Omaha. No signup.",
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    featureList: [
      "Texas Hold'em hand evaluator",
      'Pot-Limit Omaha (PLO) hand evaluator',
      'Multi-way sidepot calculator',
      'Run-it-twice and run-it-thrice payouts',
      'Multiple boards on a single deck or two decks',
    ],
    isPartOf: {
      '@type': 'WebSite',
      name: 'Stack Tracker',
      url: 'https://www.stack-tracker.com/',
    },
  },
};

const ABOUT_META: PageMetaForBuild = {
  title: 'About Stack Tracker – Poker Homegame Manager',
  description:
    'Stack Tracker is a free, independent web app for tracking home poker games. Built by a home-game host, for home-game hosts.',
  canonical: 'https://www.stack-tracker.com/about',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    url: 'https://www.stack-tracker.com/about',
    name: 'About Stack Tracker – Poker Homegame Manager',
    description:
      'Stack Tracker is a free, independent web app for tracking home poker games. Built by a home-game host, for home-game hosts.',
    isPartOf: {
      '@type': 'WebSite',
      name: 'Stack Tracker',
      url: 'https://www.stack-tracker.com/',
    },
  },
};

export const ROUTES: Array<{ path: string; outFile: string; meta: PageMetaForBuild }> = [
  {
    path: '/poker-settlement-calculator',
    outFile: 'poker-settlement-calculator.html',
    meta: SETTLEMENT_META,
  },
  {
    path: '/poker-hand-calculator',
    outFile: 'poker-hand-calculator.html',
    meta: HAND_CALC_META,
  },
  {
    path: '/about',
    outFile: 'about.html',
    meta: ABOUT_META,
  },
];

function ServerApp({ url }: { url: string }) {
  return (
    <StaticRouter location={url}>
      <Routes>
        <Route path="/poker-settlement-calculator" element={<PublicSettlementPage />} />
        <Route path="/poker-hand-calculator" element={<PublicHandCalculatorPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </StaticRouter>
  );
}

export function render(url: string): string {
  return renderToString(<ServerApp url={url} />);
}
