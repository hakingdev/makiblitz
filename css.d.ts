// Ambient declaration for global CSS side-effect imports
// (e.g. `import "./globals.css"` in app/layout.tsx).
//
// Next.js resolves these through its bundler, not through TypeScript module
// resolution, so newer TypeScript versions used by the editor flag the import
// with "Cannot find module or type declarations for side-effect import".
// `next build` (TS 5.5) accepts it either way; this keeps every editor quiet.
declare module "*.css";
