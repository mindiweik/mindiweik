export const SITE = {
  name: 'mindiweik',
  url: 'https://mindiweik.com',
  author: 'Mindi Weik',
  description: 'Software engineer, writer, builder. Figuring it out in public, one version at a time.',
  kofi: 'mindiweik',
  ga4: 'G-R9V6VXL55X',
  podcast: { status: 'active' as 'active' | 'complete' | 'archived' },
  socials: [
    { label: 'linkedin', url: 'https://www.linkedin.com/in/mindiweik/', accent: 'blog' },
    { label: 'github', url: 'https://github.com/mindiweik', accent: 'projects' },
    { label: 'gitlab', url: 'https://gitlab.com/mindiweik', accent: 'speaking' },
    { label: 'youtube', url: 'https://www.youtube.com/@mindiweik', accent: 'podcast' },
  ],
  nav: [
    { label: 'blog', href: '/blog' },
    { label: 'podcast', href: '/podcast' },
    { label: 'speaking', href: '/speaking' },
    { label: 'projects', href: '/projects' },
    { label: 'about', href: '/about' },
  ],
} as const;
