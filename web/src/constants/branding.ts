// JMWL Official Branding Constants

export const OFFICIAL_LINKS = {
  youtube: 'https://www.youtube.com/@CryptoFuture2026',
  twitter: 'https://x.com/CptFtr2026',
  telegram: 'https://t.me/fXqjJaVgaKZjYjVl',
  github: 'https://github.com/JMWL66/jmwl-autotrade',
} as const

// Brand watermark component data
export const BRAND_INFO = {
  name: 'JMWL-AutoTrade',
  tagline: 'AI Trading Platform',
  version: '1.0.0',
  social: {
    x: () => OFFICIAL_LINKS.twitter,
    tg: () => OFFICIAL_LINKS.telegram,
    yt: () => OFFICIAL_LINKS.youtube,
  }
} as const
