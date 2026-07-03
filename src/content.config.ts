import { defineCollection } from 'astro:content';
import { z } from 'zod';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    readingTime: z.number().optional(),
    youtubeUrl: z.string().url().optional(),
    // Social share override, explicit opt-in only (never auto-derived).
    // Use ~1200x630 images or LinkedIn crops unpredictably.
    ogImage: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const podcast = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/podcast' }),
  schema: z.object({
    title: z.string(),
    guest: z.string().optional(),
    version: z.string(), // "v1.0.4"
    season: z.number(),
    episodeNumber: z.number().optional(),
    pubDate: z.coerce.date(),
    duration: z.string().optional(),
    audioUrl: z.string().optional(),
    youtubeUrl: z.string().url().optional(),
    descriptor: z.string().optional(),
    chapters: z.array(z.object({ timestamp: z.string(), title: z.string() })).default([]),
    links: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
    final: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

const speaking = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/speaking' }),
  schema: z.object({
    title: z.string(),
    event: z.string(),
    date: z.coerce.date(),
    location: z.string().optional(),
    type: z.enum(['talk', 'workshop', 'panel', 'guest']).optional(),
    description: z.string().optional(),
    slidesUrl: z.string().optional(),
    recordingUrl: z.string().optional(),
    links: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
    draft: z.boolean().default(false),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: ({ image }) =>
    z
      .object({
        name: z.string(),
        blurb: z.string(),
        status: z.enum(['alpha', 'live', 'wip', 'archived']),
        stack: z.array(z.string()).default([]),
        url: z.string().optional(),
        repoUrl: z.string().optional(),
        links: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
        featured: z.boolean().default(false),
        order: z.number().optional(),
        since: z.number().int().min(2000).max(2100),
        lastUpdated: z.coerce.date().optional(),
        image: image().optional(),
        imageAlt: z.string().optional(),
      })
      .refine((d) => !d.image || !!d.imageAlt, {
        message: 'imageAlt is required when image is set',
      }),
});

export const collections = { blog, podcast, speaking, projects };
