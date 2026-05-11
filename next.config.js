// Next.js loads `.env`, `.env.local`, etc. automatically from the project
// root — no explicit dotenv call needed. (We used to load from `../.env`
// during local dev when the project was inside a parent repo; now that the
// frontend is its own repo, the standard convention is `.env.local` in this
// directory.)

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Vercel's File Tracing won't pick up `prompts/*.md` because it scans for
  // `import`/`require`, not `fs.readFile` calls. Whitelist the dir so the
  // serverless bundle actually contains the prompt files.
  outputFileTracingIncludes: {
    "/api/**/*": ["./prompts/**/*"],
    "/dashboard/**/*": ["./prompts/**/*"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "*.myshopify.com" },
      { protocol: "https", hostname: "shopify-staged-uploads.storage.googleapis.com" },
      { protocol: "https", hostname: "*.media-amazon.com" },
      { protocol: "https", hostname: "*.aliexpress.com" },
      // Supplier reference photos surfaced in the review / product detail pages.
      { protocol: "https", hostname: "*.alicdn.com" },
      { protocol: "https", hostname: "*.amazonaws.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "*.alibaba.com" },
      { protocol: "https", hostname: "*.alibabagroup.com" },
    ],
  },
};

module.exports = nextConfig;
