/**
 * esbuild configuration for bundling the CLI
 *
 * Bundles all source code into a single file for faster cold-start times.
 * Heavy dependencies (pdfkit, yaml) are kept external for lazy loading.
 */

/* eslint-disable no-undef */
import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');
const isDev = process.argv.includes('--dev');

/** @type {esbuild.BuildOptions} */
const buildOptions = {
  entryPoints: ['src/cli.tsx'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'dist/cli.js',
  format: 'esm',

  // Externalize all packages (they remain as imports from node_modules)
  // This keeps the bundle small while still benefiting from:
  // - Single file output
  // - Tree shaking of our source code
  // - Minification
  packages: 'external',

  // Production optimizations
  minify: !isDev,
  treeShaking: true,

  // Source maps for development only
  sourcemap: isDev ? 'inline' : false,

  // Define environment
  define: {
    'process.env.NODE_ENV': isDev ? '"development"' : '"production"',
  },

  // JSX configuration for React/Ink
  jsx: 'automatic',

  // Logging
  logLevel: 'info',
};

async function build() {
  try {
    if (isWatch) {
      const ctx = await esbuild.context(buildOptions);
      await ctx.watch();
      console.log('Watching for changes...');
    } else {
      const result = await esbuild.build(buildOptions);

      if (result.metafile) {
        const analysis = await esbuild.analyzeMetafile(result.metafile);
        console.log(analysis);
      }
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
