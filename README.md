# benjaminlevin.com

Source for [Benjamin Levin's portfolio](https://benjaminlevin.com): technical case studies, experience, and a portfolio assistant. Built with Next.js 16, React 19, TypeScript, and Tailwind 4.

## Run locally

Use Node.js 22 and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3003.

```sh
npm run build
npm start
```

The public checkout builds with `data/candidate/personal.example.json`, which contains public professional information only. An optional ignored `personal.json` can supply local overrides. Credentials and private candidate fields do not belong in version control.

## Content and structure

- `data/candidate/experiences/*.md` and `projects/*.md`: case-study content. Frontmatter supplies metadata; `## Bullets` supplies concise summaries; `## Detail` and its `###` sections drive the reading pages and IDE navigation.
- `data/copy.ts`: homepage and assistant copy.
- `src/lib/highlights.ts`: overview links into case-study sections.
- `src/lib/data.ts` and `markdown.ts`: content loading and rendering.
- `src/components/`: the portfolio's IDE-style layout and detail views.
- `public/media/`: public portfolio assets. Historical startup-internal illustrations and local animation-authoring sources are excluded.
- `scripts/build-context.mjs`: generates the ignored `BEN_CONTEXT.md` used by the assistant. It runs before development and production builds.

Keep technical results attached to their model, hardware, workload, measurement boundary, and limitations. PRSM and BeHuman descriptions intentionally remain high level.

## Optional services and deployment

The frontend builds without credentials. Assistant responses require an authenticated Codex CLI in the runtime; the optional resume service requires a separately configured backend. Never commit authentication state or environment values.

The Docker image uses Node.js 22. See [DEPLOYMENT.md](DEPLOYMENT.md) for the existing Compose workflow. Public source does not include deployment-specific overrides, databases, recordings, private research notes, or credentials.
