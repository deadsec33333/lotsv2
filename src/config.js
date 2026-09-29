// Everything you are likely to change lives in this file:
// project name, ticker, links, colors, economy numbers and wording.

export const CONFIG = {
  name: 'PROJECT_NAME',
  ticker: '$TICKER',
  network: 'MAINNET',
  pumpUrl: 'https://pump.fun/coin/PROJECT_TOKEN_ADDRESS',
  xUrl: '', // put your X profile link here, e.g. 'https://x.com/yourhandle'
  pageViews: '11,400+',

  colors: {
    bg: '#0E0E0C',
    band: '#1A1A17',
    card: '#1A1A17',
    line: '#2B2A26',
    text: '#F4F1EA',
    muted: '#8F897B',
    lime: '#CCFF00',
    lavender: '#D8B4FE',
  },

  // Colors an owner can pick for their text (editor swatches).
  textColors: {
    default: '#F4F1EA',
    lime: '#CCFF00',
    orange: '#FF8A3D',
    pink: '#FF5FA2',
    purple: '#B388FF',
    red: '#FF4D4D',
    green: '#3DDC84',
    yellow: '#FFD23F',
    blue: '#5EB8FF',
    muted: '#8F897B',
    gradient: 'linear-gradient(90deg,#FF8A3D,#FF5FA2)',
  },

  // Section background colors an owner can pick for background slots.
  backgroundColors: {
    default: '',
    ink: '#141412',
    moss: '#1B2415',
    plum: '#221828',
    rust: '#2A1812',
    navy: '#121A26',
    lime: '#2A3300',
  },

  economy: {
    floor: 0.01, // SOL, cheapest a slot can ever be
    takeMultiplier: 1.4, // taking an owned slot costs 1.4x its price
    previousOwnerShare: 1.15, // previous owner is credited 1.15x the price
    creatorShare: 0.05, // 5% of every take goes to the creator, the rest to treasury
    cooldownMinutes: 15, // between takes on the same slot
    decayPerWeek: 0.9, // idle slots keep 90% of their price each week
    decayMaxWeeks: 52,
    markupMin: 0.1,
    markupMax: 4,
    rentFloorPerDay: 0.0025, // rent rate must be at least 0.25% of price per day
    rentProtocolCut: 0.35,
    rentMaxDays: 7,
    upgradeDays: 21,
    upgradeBurn: { link: 50000, image: 250000, background: 250000, video: 1000000 },
    shuffleMinutes: 90,
    shuffleMaxPerWeek: 8,
    fakeSolUsd: 150, // pretend SOL price for the USD switch
  },

  limits: { text: 140, long: 700, maxImageBytes: 2000000, maxVideoBytes: 2000000 },

  sessionWallet: 'DeMo…0001',
  simulationMs: [10000, 20000],

  copy: {
    modal: {
      label: 'FIRST TIME HERE?',
      title: 'This page is not a page.',
      body: 'It looks like a normal landing page. It isn’t. Every nav link, headline, image, button and footer link you can see is a separate slot with its own owner, and every one of them can be bought.',
      docs: 'READ THE DOCS',
      ok: 'GOT IT',
      cheapest: 'SHOW ME THE CHEAPEST SLOT',
    },
    demoNote: 'Demo only. No wallet is connected and no SOL or tokens move.',
  },
};
