export const SITE_URL = 'https://lights-out-puzzle-game.vercel.app'
export const SITE_NAME = 'Lights Out'
export const SITE_TITLE = 'Lights Out — A Classic Tile-Flipping Puzzle'
export const SITE_DESCRIPTION =
  'Tap a tile to flip it and its neighbors. Turn every light off in as few moves as possible. Play Lights Out with hints, timed runs, and global high scores.'
export const OG_IMAGE_URL = `${SITE_URL}/og-image.png`
export const OG_IMAGE_ALT =
  'The Lights Out light-bulb logo and title on a warm cream background'

export const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  description: SITE_DESCRIPTION,
  applicationCategory: 'GameApplication',
  operatingSystem: 'Any',
  browserRequirements: 'Requires JavaScript',
  inLanguage: 'en',
  isAccessibleForFree: true,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  image: OG_IMAGE_URL,
  creator: [
    { '@type': 'Person', name: 'Rahul Chakraborty' },
    { '@type': 'Person', name: 'Arnav Ghosh' },
  ],
}
