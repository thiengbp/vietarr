# Home Library Movies and Series Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the home library into separate movie and series rows backed by Radarr and Sonarr, showing only content with a playable file.

**Architecture:** Fetch movie and series libraries in parallel in the home Server Component. A pure `buildHomeLibraryModel` function owns filtering, stale propagation, hero/activity preservation, counts, and destination URLs; a focused `HomeLibrary` component renders the two independent sections and shared empty state.

**Tech Stack:** Next.js 15 Server Components, React 19, Tailwind CSS, Node.js 22 `node:test`, existing VietArr Core library APIs.

## Global Constraints

- Movie library source remains `GET /library/movies`; series library source is `GET /library/series`.
- Only items with `status === "available"` appear in the home library.
- A series appears once as a series poster; episodes never appear as home-library cards.
- Movie hero, recently viewed, and movie “Đang tải và chờ” behavior do not change.
- Series do not enter the hero or activity rail in Block 09.
- Header stale state is `movieStale || seriesStale`.
- No Core API, database, download flow, country filter, or detail-page changes.
- Footer copy is exactly `VietArr · Thư viện từ Radarr & Sonarr · Khám phá từ TMDB`.
- Production smoke must not create a download request.

## File Structure

- Create `web/lib/homeLibrary.js`: pure home-library view-model construction; no React or network dependencies.
- Create `web/test/homeLibrary.test.mjs`: Node tests for filtering, links, independent empty states, hero/activity preservation, and stale propagation.
- Create `web/components/HomeLibrary.js`: presentation-only component for the two library sections and shared empty state.
- Modify `web/app/page.js`: parallel data fetch, model construction, and component composition.
- Modify `web/package.json`: run Node unit tests before the existing lint test.
- Modify `docs/blocks/BLOCK-09-home-library-series.md`: implementation and production evidence checklist.

---

### Task 1: Pure Home Library Model

**Files:**
- Create: `web/lib/homeLibrary.js`
- Create: `web/test/homeLibrary.test.mjs`
- Modify: `web/package.json`

**Interfaces:**
- Consumes: `{ movies: MediaItem[], series: MediaItem[], movieStale?: boolean, seriesStale?: boolean }`.
- Produces: `buildHomeLibraryModel(input)` returning `{ availableMovies, activityMovies, availableSeries, heroMovie, movieCards, seriesCards, stale, empty }`.
- `movieCards` and `seriesCards` contain `{ item, href }`; href is `/movies/${item.id}` or `/series/${item.id}`.

- [ ] **Step 1: Add the failing model tests**

Create `web/test/homeLibrary.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { buildHomeLibraryModel } from "../lib/homeLibrary.js";

const movieReady = { id: "movie-1", title: "Movie Ready", status: "available", backdropUrl: "/movie-bg.jpg" };
const movieWaiting = { id: "movie-2", title: "Movie Waiting", status: "missing" };
const seriesReady = { id: "series-1", title: "Series Ready", status: "available", quality: "3/33 tập" };
const seriesWaiting = { id: "series-2", title: "Series Waiting", status: "missing" };

test("separates playable movies and series with type-safe destinations", () => {
  const model = buildHomeLibraryModel({
    movies: [movieReady, movieWaiting],
    series: [seriesReady, seriesWaiting]
  });

  assert.deepEqual(model.availableMovies, [movieReady]);
  assert.deepEqual(model.activityMovies, [movieWaiting]);
  assert.deepEqual(model.availableSeries, [seriesReady]);
  assert.deepEqual(model.movieCards, [{ item: movieReady, href: "/movies/movie-1" }]);
  assert.deepEqual(model.seriesCards, [{ item: seriesReady, href: "/series/series-1" }]);
  assert.equal(model.heroMovie, movieReady);
  assert.equal(model.empty, false);
});

test("keeps movie and series empty states independent", () => {
  const onlySeries = buildHomeLibraryModel({ movies: [], series: [seriesReady] });
  assert.deepEqual(onlySeries.movieCards, []);
  assert.equal(onlySeries.seriesCards.length, 1);
  assert.equal(onlySeries.empty, false);

  const nothingPlayable = buildHomeLibraryModel({ movies: [movieWaiting], series: [seriesWaiting] });
  assert.equal(nothingPlayable.movieCards.length, 0);
  assert.equal(nothingPlayable.seriesCards.length, 0);
  assert.equal(nothingPlayable.empty, true);
});

test("propagates stale state from either source without promoting series to hero", () => {
  const model = buildHomeLibraryModel({
    movies: [movieReady],
    series: [seriesReady],
    movieStale: false,
    seriesStale: true
  });

  assert.equal(model.stale, true);
  assert.equal(model.heroMovie, movieReady);
  assert.deepEqual(model.activityMovies, []);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
cd web
node --test test/homeLibrary.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/homeLibrary.js`.

- [ ] **Step 3: Implement the minimal pure model**

Create `web/lib/homeLibrary.js`:

```js
export function buildHomeLibraryModel({
  movies = [],
  series = [],
  movieStale = false,
  seriesStale = false
}) {
  const availableMovies = movies.filter((item) => item.status === "available");
  const activityMovies = movies.filter((item) => item.status !== "available");
  const availableSeries = series.filter((item) => item.status === "available");
  const heroMovie = availableMovies.find((item) => item.backdropUrl) || availableMovies[0] || null;
  const movieCards = availableMovies.map((item) => ({ item, href: `/movies/${item.id}` }));
  const seriesCards = availableSeries.map((item) => ({ item, href: `/series/${item.id}` }));

  return {
    availableMovies,
    activityMovies,
    availableSeries,
    heroMovie,
    movieCards,
    seriesCards,
    stale: Boolean(movieStale || seriesStale),
    empty: movieCards.length === 0 && seriesCards.length === 0
  };
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
cd web
node --test test/homeLibrary.test.mjs
```

Expected: 3 tests PASS, 0 failures.

- [ ] **Step 5: Make unit tests part of the Web test command**

Change `web/package.json` scripts from:

```json
"test": "npm run lint"
```

to:

```json
"test": "node --test test/*.test.mjs && npm run lint"
```

- [ ] **Step 6: Run the complete Web test command**

Run:

```bash
cd web
pnpm test
```

Expected: 3 Node tests PASS and ESLint reports 0 errors; pre-existing warnings may remain.

- [ ] **Step 7: Commit the model and tests**

```bash
git add web/lib/homeLibrary.js web/test/homeLibrary.test.mjs web/package.json
git commit -m "test: define home library model"
```

---

### Task 2: Separate Movie and Series Library Sections

**Files:**
- Create: `web/components/HomeLibrary.js`
- Modify: `web/app/page.js:1-69`

**Interfaces:**
- Consumes: `HomeLibrary({ movieCards, seriesCards, empty })` from Task 1's view model.
- Produces: two independently conditional sections with ids `movie-library-title` and `series-library-title`, plus a shared empty state.
- Uses existing `PosterCard` and `EmptyState`; no new card styling contract.

- [ ] **Step 1: Extend the model test with section metadata and verify RED**

Add these assertions to the first test in `web/test/homeLibrary.test.mjs`:

```js
assert.deepEqual(model.sections.map(({ id, title, href, count }) => ({ id, title, href, count })), [
  { id: "movie-library-title", title: "Phim lẻ của anh", href: "/movies", count: 1 },
  { id: "series-library-title", title: "Phim bộ của anh", href: "/series", count: 1 }
]);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
cd web
node --test test/homeLibrary.test.mjs
```

Expected: FAIL because `model.sections` is undefined.

- [ ] **Step 3: Add section metadata to the model**

In `web/lib/homeLibrary.js`, create and return:

```js
const sections = [
  {
    id: "movie-library-title",
    title: "Phim lẻ của anh",
    description: `${movieCards.length.toLocaleString("vi-VN")} phim sẵn sàng để xem.`,
    href: "/movies",
    linkLabel: "Xem tất cả phim lẻ",
    count: movieCards.length,
    cards: movieCards
  },
  {
    id: "series-library-title",
    title: "Phim bộ của anh",
    description: `${seriesCards.length.toLocaleString("vi-VN")} bộ sẵn sàng để xem.`,
    href: "/series",
    linkLabel: "Xem tất cả phim bộ",
    count: seriesCards.length,
    cards: seriesCards
  }
];
```

Add `sections` to the returned object.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
cd web
node --test test/homeLibrary.test.mjs
```

Expected: 3 tests PASS, 0 failures.

- [ ] **Step 5: Create the presentation component**

Create `web/components/HomeLibrary.js`:

```jsx
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PosterCard } from "@/components/PosterCard";

function LibrarySection({ section }) {
  if (!section.cards.length) return null;

  return (
    <section className="home-section home-library" aria-labelledby={section.id}>
      <header className="home-section__head">
        <div>
          <h2 id={section.id}>{section.title}</h2>
          <p>{section.description}</p>
        </div>
        <Link href={section.href} aria-label={section.linkLabel} className="home-section__link">
          Xem tất cả <span aria-hidden="true">→</span>
        </Link>
      </header>
      <div className="poster-grid">
        {section.cards.map(({ item, href }) => (
          <PosterCard key={item.id} item={item} href={href} showStatus={false} />
        ))}
      </div>
    </section>
  );
}

export function HomeLibrary({ sections, empty }) {
  if (empty) {
    return (
      <section className="home-section home-library" aria-labelledby="library-title">
        <h2 id="library-title" className="sr-only">Thư viện của anh</h2>
        <EmptyState
          title="Chưa có nội dung sẵn sàng"
          detail="Phim lẻ và phim bộ sẽ xuất hiện tại đây sau khi có file để xem."
        />
      </section>
    );
  }

  return sections.map((section) => <LibrarySection key={section.id} section={section} />);
}
```

- [ ] **Step 6: Integrate both sources in the home page**

In `web/app/page.js`:

1. Import `getSeries`, `HomeLibrary`, and `buildHomeLibraryModel`.
2. Replace the single `getMovies()` call and inline filters with:

```js
const [movieResult, seriesResult] = await Promise.all([getMovies(), getSeries()]);
const model = buildHomeLibraryModel({
  movies: movieResult.data,
  series: seriesResult.data,
  movieStale: movieResult.stale,
  seriesStale: seriesResult.stale
});
```

3. Pass `model.stale` to `AppHeader`.
4. Continue passing `model.heroMovie`, `model.availableMovies`, and `model.activityMovies` to the existing hero/recent/activity components.
5. Replace the inline “Thư viện của anh” section with:

```jsx
<HomeLibrary sections={model.sections} empty={model.empty} />
```

6. Replace the footer text with:

```jsx
<p>VietArr · Thư viện từ Radarr &amp; Sonarr · Khám phá từ TMDB</p>
```

- [ ] **Step 7: Run complete Web verification**

Run:

```bash
cd web
pnpm test
pnpm build
```

Expected: unit tests PASS, lint has 0 errors, and Next production build exits 0.

- [ ] **Step 8: Inspect the focused diff**

Run:

```bash
git diff --check
git diff -- web/app/page.js web/components/HomeLibrary.js web/lib/homeLibrary.js web/test/homeLibrary.test.mjs web/package.json
```

Expected: no whitespace errors; no Core, API, episode, or download files changed.

- [ ] **Step 9: Commit the UI integration**

```bash
git add web/app/page.js web/components/HomeLibrary.js web/lib/homeLibrary.js web/test/homeLibrary.test.mjs web/package.json
git commit -m "feat: split home movie and series libraries"
```

---

### Task 3: Block Record, CI, Production Deployment, and Smoke

**Files:**
- Create: `docs/blocks/BLOCK-09-home-library-series.md`
- Modify after evidence: `docs/blocks/BLOCK-09-home-library-series.md`

**Interfaces:**
- Consumes: Web image built from the Task 2 commit.
- Produces: production home page with separate movie and series rows and a durable Block 09 evidence record.

- [ ] **Step 1: Create the Block 09 record**

Create `docs/blocks/BLOCK-09-home-library-series.md` with:

```md
# BLOCK-09 — HOME LIBRARY MOVIES AND SERIES

> **Trạng thái:** ACTIVE

## Scope

- Tách “Phim lẻ của anh” và “Phim bộ của anh” trên trang chủ.
- Radarr và Sonarr được tải song song; chỉ nội dung `available` xuất hiện.
- Không thay đổi hero, activity rail, Core API hoặc download flow.

## Definition of Done

- [ ] Pure model tests PASS.
- [ ] Web lint/build PASS.
- [ ] Movie và series section ẩn độc lập khi trống.
- [ ] Header stale nếu Radarr hoặc Sonarr stale.
- [ ] Production hiển thị đúng movie và series card/link.
- [ ] Smoke không tạo download request.

## Evidence

- Chờ CI và production smoke.
```

- [ ] **Step 2: Run final local verification before push**

Run:

```bash
cd web
pnpm test
pnpm build
cd ..
git diff --check
git status --short
```

Expected: tests/build exit 0; only intended Web and Block 09 files are tracked changes; `graphify-out/` remains untracked and unstaged if present.

- [ ] **Step 3: Update the code graph**

Run:

```bash
graphify update .
```

Expected: graph update succeeds; never stage `graphify-out/`.

- [ ] **Step 4: Commit and push the Block record**

```bash
git add docs/blocks/BLOCK-09-home-library-series.md
git commit -m "docs: open block 09 home libraries"
git push origin HEAD:main
```

- [ ] **Step 5: Wait for required GitHub Actions**

Run:

```bash
IMPLEMENTATION_SHA="$(git rev-parse HEAD)"
CI_RUN_ID="$(gh run list --repo thiengbp/vietarr --commit "$IMPLEMENTATION_SHA" --workflow CI --limit 1 --json databaseId --jq '.[0].databaseId')"
IMAGE_RUN_ID="$(gh run list --repo thiengbp/vietarr --commit "$IMPLEMENTATION_SHA" --workflow 'Container Images' --limit 1 --json databaseId --jq '.[0].databaseId')"
gh run watch "$CI_RUN_ID" --repo thiengbp/vietarr --exit-status
gh run watch "$IMAGE_RUN_ID" --repo thiengbp/vietarr --exit-status
```

Expected: `CI` and `Container Images` both complete with `success` for the implementation commit.

- [ ] **Step 6: Back up configuration and deploy Web only**

From the implementation checkout, deploy to `jooh@10.10.10.51`:

```bash
SHORT_SHA="$(git rev-parse --short=7 HEAD)"
ssh jooh@10.10.10.51 "cd /opt/vietarr && cp .env .env.backup-block09-${SHORT_SHA} && sed -i 's#^VIETARR_WEB_IMAGE=.*#VIETARR_WEB_IMAGE=ghcr.io/thiengbp/vietarr-web:sha-${SHORT_SHA}#' .env && docker compose pull web && docker compose up -d --no-deps web"
```

Expected: only `vietarr-web` is recreated; Core, Sonarr, Radarr, and qBittorrent remain untouched.

- [ ] **Step 7: Run read-only production smoke**

Verify:

```bash
docker inspect vietarr-web --format '{{.Config.Image}} {{if .State.Health}}{{.State.Health.Status}}{{end}}'
curl -ks --resolve vietarr.home.arpa:443:127.0.0.1 \
  -H 'Cookie: vietarr_token=production-smoke' \
  https://vietarr.home.arpa/ > /tmp/vietarr-block09-home.html
grep -o 'Phim lẻ của anh' /tmp/vietarr-block09-home.html | wc -l
grep -o 'Phim bộ của anh' /tmp/vietarr-block09-home.html | wc -l
grep -o 'The Eternal Fragrance' /tmp/vietarr-block09-home.html | wc -l
```

Expected: Web image matches `sha-${SHORT_SHA}` and is healthy; each heading appears once; `The Eternal Fragrance` appears once; no POST request is made.

- [ ] **Step 8: Verify destination links and current library counts**

Inspect `/tmp/vietarr-block09-home.html` without transmitting data:

```bash
grep -o 'href="/movies/[^"]*"' /tmp/vietarr-block09-home.html | sort -u
grep -o 'href="/series/[^"]*"' /tmp/vietarr-block09-home.html | sort -u
```

Expected: movie cards use `/movies/...`; The Eternal Fragrance uses `/series/series-1`; no episode URL appears in the home library.

- [ ] **Step 9: Record production evidence without releasing the block**

Update `docs/blocks/BLOCK-09-home-library-series.md`:

- Mark verified DoD items `[x]`.
- Record implementation SHA, image SHA, container health, section counts, destination link evidence, and that no download request was sent.
- Keep status `ACTIVE` until the user sends exact approval `APPROVED BLOCK 09`.

Then commit and push:

```bash
git add docs/blocks/BLOCK-09-home-library-series.md
git commit -m "docs: record block 09 production evidence"
git push origin HEAD:main
```

Expected: production remains on the implementation Web image; the documentation-only image build is not redeployed.
