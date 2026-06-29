export const SITE = {
  name: 'mindi.weik',
  url: 'https://mindiweik.com',
  author: 'Mindi Weik',
  description: 'Software engineer, writer, builder. Figuring it out in public, one version at a time.',
  kofi: 'wippodcast', // TODO: swap to personal handle when changed
  podcast: { status: 'active' as 'active' | 'complete' | 'archived' },
  nav: [
    { label: 'blog', href: '/blog' },
    { label: 'podcast', href: '/podcast' },
    { label: 'speaking', href: '/speaking' },
    { label: 'projects', href: '/projects' },
    { label: 'about', href: '/about' },
  ],
} as const;
