export const SITE = {
  name: 'mindiweik',
  url: 'https://mindiweik.com',
  author: 'Mindi Weik',
  description: 'Software engineer, writer, builder. Figuring it out in public, one version at a time.',
  kofi: 'mindiweik',
  ga4: 'G-R9V6VXL55X',
  podcast: { status: 'active' as 'active' | 'complete' | 'archived' },
  nav: [
    { label: 'blog', href: '/blog' },
    { label: 'podcast', href: '/podcast' },
    { label: 'speaking', href: '/speaking' },
    { label: 'projects', href: '/projects' },
    { label: 'about', href: '/about' },
  ],
} as const;
