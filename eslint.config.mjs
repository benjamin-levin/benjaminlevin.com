// Minimal flat config — Next.js 16's eslint-config-next + FlatCompat trips a
// circular-ref bug, so we keep this lean and rely on `next build` for the
// real type/safety enforcement.
const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", ".next/dev/**", "data/**"],
  },
];

export default eslintConfig;
