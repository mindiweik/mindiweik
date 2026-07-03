/// <reference types="astro/client" />

// Public env vars the site reads at build/run time. Declaring them here gives
// import.meta.env the right shape so typed accessors (see src/lib/comments.ts)
// type-check under astro check.
interface ImportMetaEnv {
  // Local-dev override so the comments UI can point at a php -S server.
  readonly PUBLIC_COMMENTS_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
