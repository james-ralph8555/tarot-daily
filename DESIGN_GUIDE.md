# Tarot Daily — Sacred Aesthetic UI System

*A practical, production-ready visual language for a daily Tarot experience inspired by Catholic mysticism, Gnostic cosmology, and Hermetic symbolism — without kitsch or appropriation.*

---

## 1) North Star & Principles

**North Star:** *Serene revelation.* The interface should feel like opening an illuminated manuscript at dawn: quiet, precise, numinous.

**Principles**

* **Reverent, not exploitative:** We reference artistic traditions (stained glass geometry, illuminated capitals, lapis + gold palette, alchemical glyphs) rather than sacred rites or iconography specific to worship.
* **Legible first:** Aesthetic never sacrifices contrast, type size, or motion-reduced paths.
* **Weightless performance:** SVGs, CSS paints, and vector textures over raster backgrounds. Streamed text appears as “ink writing itself.”
* **Determinism, ritual:** Repeatable micro-rituals (card flip, halo on first token) reinforce daily habit.

---

## 2) Palette & Tokens (Tailwind-first)

### Core Colors

* **Lapis (lapis.800)** `#1B2A4A` — ultramarine manuscript pigment.
* **Cardinal (cardinal.700)** `#6A1F1B` — oxblood vellum ink.
* **Parchment (parchment.50)** `#F3E9DC` — warm paper.
* **Gilded (gilded.400)** `#E6C75C` — matte gold leaf highlight.
* **Charcoal (ash.950)** `#0E0F12` — sacred-dark canvas.
* **Incense (incense.300)** `#C8BFB3` — warm gray text accents.

### Gradient Tokens

* **`bg-gradient-lapis`**: radial at top-center: lapis.900 → lapis.700 → transparent.
* **`bg-gradient-cardinal`**: linear 135°: cardinal.800 → ash.950.

### Effects

* **Halo glow** (for gilded accents): shadow color `rgba(230,199,92,0.35)` outer/inner.
* **Vellum noise**: low-contrast SVG grain mask; 3–5% opacity.

### Tailwind config excerpt

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  theme: {
    extend: {
      colors: {
        lapis: {
          50: '#EEF2FA', 100: '#DCE6F5', 200: '#B7C7E4', 300: '#8EA6D3',
          400: '#5A7BB9', 500: '#355F9D', 600: '#274C7C', 700: '#203D63',
          800: '#1B2A4A', 900: '#131D33', 950: '#0B1221'
        },
        cardinal: { 50:'#F8ECEC',100:'#F3D7D6',200:'#E7AFAE',300:'#D87F7C',400:'#BF5A56',500:'#A33C38',600:'#832F2B',700:'#6A1F1B',800:'#4B1512',900:'#2D0C0A'},
        parchment: {50:'#F3E9DC',100:'#EADBC6',200:'#DCC6A6',300:'#CDAE87',400:'#BFA474',500:'#A78B5E'},
        gilded: {200:'#F1DE9A',300:'#EBD77F',400:'#E6C75C',500:'#B08968'},
        ash: {900:'#111418',950:'#0E0F12'},
        incense: {200:'#D9D2C9',300:'#C8BFB3',400:'#A59C8E'}
      },
      fontFamily: {
        display: ['Cinzel', 'Cormorant Garamond', 'serif'],
        serif: ['EB Garamond', 'Cardo', 'serif'],
        sans: ['Inter', 'system-ui', 'ui-sans-serif']
      },
      boxShadow: {
        halo: '0 0 0 1px rgba(230,199,92,0.35), 0 8px 30px rgba(0,0,0,0.45), 0 0 40px rgba(230,199,92,0.15)'
      },
      backgroundImage: {
        'gradient-lapis': 'radial-gradient(1200px 600px at 50% -10%, #131D33 0%, #1B2A4A 40%, rgba(27,42,74,0) 70%)',
        'gradient-cardinal': 'linear-gradient(135deg, #6A1F1B 0%, #0E0F12 60%)'
      }
    }
  }
}
```

---

## 3) Typography System

* **Display (H1–H2)**: **Cinzel** (or **Cinzel Decorative** very sparingly) — Roman-inscription vibe, echoes ecclesiastical titling.
* **Editorial (H3–H5, body longform)**: **EB Garamond** — scholarly, generous x-height; great for drop caps.
* **Interface**: **Inter** — clarity for labels, buttons, and dense UI.

**Usage rules**

* Headline ligatures off for clarity; use **small caps** for section labels.
* Add **drop caps** for the first paragraph of the reading (CSS `::first-letter`).
* Tighten letterspacing on display (-1% to -2%).

```css
.reading p:first-of-type::first-letter{
  font-family: "EB Garamond", serif;
  font-size: 3.2em; line-height: .8; float: left; padding-right: .08em;
  color: theme(colors.gilded.400);
  text-shadow: 0 0 12px rgba(230,199,92,.25);
}
```

---

## 4) Motifs & Visual Language

**Catholic Mysticism**

* Stained-glass **grid** (thin geometric lead lines) used as faint overlays in headers.
* **Illuminated capitals**: ornamental drop caps, floral marginalia as subtle SVG corner filigree.

**Gnosticism**

* **Pleroma rings**: concentric halos behind card spreads; subtle depth parallax.
* Stars/aeons as **point lattice** backgrounds with low opacity.

**Hermeticism**

* **Alchemical base glyphs** (☿, 🜍, 🜔) and **planetary symbols** used as decorative bullets, not icons of action.
* **Ouroboros** line motif for dividers (SVG path with stroke-dasharray animation at 1–2s).

> Rule: No crucifixes, saints, or sacred seals as functional UI. Keep sacred content as non-interactive decoration.

---

## 5) Layout & Composition

**App shell**:

* Top bar: centered title logotype; subtle gilded rule; background `bg-gradient-lapis`.
* Side drawer on mobile with soft **incense** panel.

**Today’s Draw** (triptych):

* Central card at 1.0 scale, sides at 0.9 scale; soft perspective.
* **Altarpiece** feel: frame the spread with thin gold rules and corner filigree.

**Reading panel**:

* Parchment card with vellum noise mask; 12–16px inner border in gilded with low-opacity halo.
* Section markers (Overview / Cards / Synthesis / Reflection) use small caps + gilded pilcrow ¶.

**History grid**:

* Tiled folios: date in small caps, miniature thumbnail of drawn cards, faint stained-glass overlay.

---

## 6) Motion & Microinteractions

* **Card revelation**: `rotateY(180deg)` flip with cubic-bezier(0.2,0.8,0.2,1). On land, a 250ms gold **bloom** (shadow-halo) then fades.
* **Streaming text**: cursor-like caret; first tokens fade in with a faint ink spread (blur→sharp over 120ms).
* **Feedback**: Upvote triggers radiating halo + tiny 12-point star burst; Downvote triggers gentle desaturation wave. Haptics on mobile.
* **Focus**: rings use gilded.300 outer + lapis.500 inner to remain AA+ contrast.
* **Prefers-reduced-motion**: all transforms replaced with opacity-only.

```css
@media (prefers-reduced-motion: reduce){
  .anim,*{animation:none !important; transition:none !important}
}
```

---

## 7) Iconography & Ornaments

* Build an **SVG sprite** with: suits (♠︎/♣︎/♥︎/♦︎ → Swords/Wands/Cups/Pentacles), planetary symbols, base alchemical glyphs, pilcrow, paragraph ornament, corner filigree.
* Stroke width 1.25–1.5; use `currentColor` to inherit.
* Decorative only; keep action icons standard (chevrons, close, settings) to avoid confusion.

---

## 8) Component Recipes (SolidJS + Tailwind)

### Tarot Card

```tsx
// components/TarotCard.tsx
import { createSignal, JSX } from 'solid-js'

export function TarotCard(props: { front: JSX.Element; back: JSX.Element; reversed?: boolean }){
  const [flipped, setFlipped] = createSignal(false)
  return (
    <button
      aria-label="Reveal card"
      onClick={() => setFlipped(!flipped())}
      class="relative h-64 w-40 [perspective:1200px] group focus:outline-none focus:ring-2 focus:ring-gilded-300 rounded-xl"
    >
      <div class="absolute inset-0 rounded-xl shadow-halo bg-ash-950/70 border border-gilded-400/40 overflow-hidden">
        {/* filigree corners */}
        <svg class="absolute inset-0 opacity-20 pointer-events-none" viewBox="0 0 100 160" preserveAspectRatio="none">
          <rect x="2" y="2" width="96" height="156" rx="8" ry="8" fill="none" stroke="url(#g)"/>
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#E6C75C"/>
              <stop offset="100%" stop-color="#8C6A2E"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div
        class="absolute inset-0 rounded-xl transition-transform duration-700 [transform-style:preserve-3d]"
        classList={{ '[transform:rotateY(180deg)]': flipped() }}
      >
        <div class="absolute inset-0 backface-hidden grid place-items-center bg-gradient-cardinal rounded-xl">
          {props.back}
        </div>
        <div class="absolute inset-0 backface-hidden grid place-items-center bg-ash-950/90 rounded-xl [transform:rotateY(180deg)]"
             classList={{ 'rotate-180': props.reversed }}>
          {props.front}
        </div>
      </div>
    </button>
  )
}
```

### Reading Panel

```tsx
// components/ReadingPanel.tsx
export function ReadingPanel(props: { children: any; title?: string }){
  return (
    <section class="relative rounded-2xl border border-gilded-400/30 bg-parchment-50 text-ash-950 shadow-halo">
      <div class="absolute inset-0 opacity-[.04] mix-blend-multiply" style="mask-image:url('/textures/vellum-noise.svg'); mask-size: 600px;"/>
      {props.title && (
        <header class="px-5 pt-5 flex items-center gap-3 text-lapis-50 bg-gradient-lapis rounded-t-2xl">
          <h2 class="font-display tracking-tight text-xl text-gilded-300 drop-shadow">{props.title}</h2>
          <span class="text-gilded-400 text-sm">¶</span>
        </header>
      )}
      <div class="p-6 prose prose-amber max-w-none reading">
        {props.children}
      </div>
    </section>
  )
}
```

### Feedback Widget (binary + tags + rationale)

```tsx
// components/Feedback.tsx
import { createSignal } from 'solid-js'

const TAGS = ['too vague','insightful','too long','eerily specific','uplifting','confusing']

export function Feedback(props: { onSubmit: (p:{thumb:1|-1; tags:string[]; rationale?:string})=>void }){
  const [thumb, setThumb] = createSignal<1|-1|0>(0)
  const [tags, setTags] = createSignal<string[]>([])
  const [text, setText] = createSignal('')
  function toggle(tag:string){
    setTags(prev => prev.includes(tag) ? prev.filter(t=>t!==tag) : [...prev, tag])
  }
  return (
    <div class="mt-6 rounded-xl border border-gilded-400/30 bg-ash-950/40 text-parchment-50 p-4">
      <p class="text-sm text-incense-300 mb-3">How did this reading land for you?</p>
      <div class="flex gap-3">
        <button class="px-3 py-2 rounded-lg border hover:shadow-halo"
          classList={{'bg-lapis-700 border-gilded-400/50': thumb()===1, 'border-incense-300/30': thumb()!==1}}
          onClick={()=>setThumb(1)} aria-pressed={thumb()===1}>👍 Blessed</button>
        <button class="px-3 py-2 rounded-lg border hover:shadow-halo"
          classList={{'bg-cardinal-700 border-gilded-400/50': thumb()===-1, 'border-incense-300/30': thumb()!==-1}}
          onClick={()=>setThumb(-1)} aria-pressed={thumb()===-1}>👎 Needs clarity</button>
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        {TAGS.map(t=> (
          <button onClick={()=>toggle(t)} class="text-xs px-2 py-1 rounded-full border"
            classList={{'bg-gilded-400 text-ash-950 border-gilded-400': tags().includes(t), 'border-incense-300/30 text-incense-300': !tags().includes(t)}}>{t}</button>
        ))}
      </div>
      <textarea value={text()} onInput={e=>setText(e.currentTarget.value)} placeholder="Optional—why?" class="mt-3 w-full rounded-lg bg-ash-950/60 border border-incense-300/30 p-3 text-sm"/>
      <div class="mt-3 flex justify-end">
        <button disabled={!thumb()} onClick={()=>props.onSubmit({thumb: (thumb()||-1) as 1|-1, tags: tags(), rationale:text()||undefined})}
          class="px-4 py-2 rounded-lg bg-gilded-400 text-ash-950 font-semibold shadow-halo disabled:opacity-40">Submit</button>
      </div>
    </div>
  )
}
```

---

## 9) Textures & Assets

* **Vellum noise**: single 1–2KB SVG noise file tiled via `mask-image`.
* **Stained glass**: lightweight SVG path grid as absolute overlay; opacity 3–6%.
* **Filigree corners**: SVGs in sprite; scale with container.
* **Planetary & alchemical glyphs**: outline-only SVGs; ensure `aria-hidden="true"` unless semantically relevant.

---

## 10) Accessibility

* Maintain **WCAG AA** for body text (≥ 4.5:1); gilded-on-parchment tested.
* **Motion reductions** implemented; no critical info conveyed via animation.
* **Screen reader**: announce card positions (“Left — Past, Center — Present, Right — Future”).
* **Disclaimers**: non-dismissable link at footer; plain language.

---

## 11) Page Compositions

### Home (Today’s Draw)

* Hero header with `bg-gradient-lapis`, title in Cinzel, subheader in EB Garamond.
* Triptych cards centered; reveal CTA.
* ReadingPanel below fold; streaming copy; Feedback at end.
* Footer with ouroboros divider and legal.

### History

* Masonry folios; date chip in small caps; quick preview of spread; filter by tag/outcome.

### Settings

* Plain UI with incense neutrals; standard toggles and push opt-in card.

---

## 12) Performance Notes

* Bundle ornaments as **SVG sprite**; load once.
* Fonts: subset (Latin only), `font-display: swap`.
* Prefer CSS effects over blur-backdrop (mobile perf).
* Use `content-visibility:auto` for long readings.

---

## 13) Implementation Checklist (1-week skin over your MVP)

1. **Install fonts** (Cinzel, EB Garamond, Inter) + Tailwind tokens.
2. **Global shell** with gradients, parchment card, and halo shadow.
3. Build **TarotCard**, **ReadingPanel**, **Feedback** from above.
4. Add **streaming ink** animation + reduced-motion fallback.
5. Wire **SVG sprite** for glyphs + corner filigree.
6. Ship **vellum noise** + stained-glass overlays.
7. Audit **contrast** + keyboard focus + SR labels.

---

## 14) Future-facing (nice-to-haves)

* **Dynamic theming by spread** (planetary color accents based on cards drawn).
* **Constellation tracer** microgame while waiting for first token (GSAP or Motion One), disabled on reduced-motion.
* **Holographic foil** effect on rare daily events (CSS conic-gradient + displacement map).
* **Seasonal variants** (Advent/Lent palettes, solstice palettes) as pref options.

---

## 15) Brand Snippets

**Wordmark**: “Tarot Daily” in Cinzel with a thin gilded rule. Tagline: *Lux in Arcana*.

**Tone**: Calm, invitational, non-prescriptive. Examples:

* “Let’s reflect.”
* “Hold this lightly.”
* “A question to sit with…”.

---

## 16) Respect & Cultural Guidance

* Avoid sacred sacrament symbols as UI icons.
* Offer a **“Minimal symbols”** toggle to hide esoteric glyphs entirely.
* Credit traditions in an **About** page; cite artistic inspirations (stained glass, manuscripts, alchemical diagrams).

---

## 17) Exportables

* SVG sprite (glyphs, filigree, ouroboros divider)
* `tailwind.config.ts` (above)
* Components: `TarotCard.tsx`, `ReadingPanel.tsx`, `Feedback.tsx`
* Textures: `vellum-noise.svg`, `stained-glass.svg`

*Drop these into your SolidStart project and the site will immediately take on the “Serene revelation” skin without touching app logic.*

