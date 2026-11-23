process.env.BUILD_TARGET = 'android';

const { build } = await import('vite');

await build();
