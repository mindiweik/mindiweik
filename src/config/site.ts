export const SITE = {
  name: 'mindiweik',
  url: 'https://mindiweik.com',
  author: 'Mindi Weik',
  description: 'Software engineer, writer, builder. Figuring it out in public, one version at a time.',
  kofi: 'mindiweik',
  podcast: { status: 'active' as 'active' | 'complete' | 'archived' },
  nav: [
    { label: 'blog', href: '/blog' },
    { label: 'podcast', href: '/podcast' },
    { label: 'speaking', href: '/speaking' },
    { label: 'projects', href: '/projects' },
    { label: 'about', href: '/about' },
  ],
} as const;
