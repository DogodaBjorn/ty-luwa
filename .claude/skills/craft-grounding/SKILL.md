---
name: craft-grounding
description: >-
  Canonical craft grounding for the Ty LuWa holiday-rental site (compiled from five
  authoritative books on writing, content design, usability and visual design, with
  page-level provenance). Use when writing or editing page copy in any site language,
  designing or critiquing pages, the availability-request flow or navigation, judging
  visual/layout choices, selecting photos, or gathering design references.
---

# Craft grounding for Ty LuWa

Ty LuWa is Luuk & Wanda's private mobil-home on Camping Le Conguel (Quiberon),
presented honestly and warmly; success is a guest sending an availability request and
getting personal contact. This skill grounds every content and design decision in the
reconciled canon of five authoritative sources, applied to a rental site whose brand
law is already unusually explicit.

## Position among this repo's assets

- **The repo's own law wins on facts, voice and values**: the merkwetten in
  `CLAUDE.md` (feitenblad, attribution, request model, no dark patterns),
  `content/site-content.json` (the copy surface, four languages),
  `content/routes.json`, `docs/MEERTALIGHEID.md` and `assets/brand/`. The
  feitenblad is never contradicted and never extended by invention; copy changes
  go through site-content.json and a rebuild, never into generated HTML.
- This canon is the judgment layer underneath: why those laws work, and cover for
  cases they don't address. Where a house rule deliberately departs from a canonical
  principle, that is applied doctrine to record, not a conflict to resolve.
- Full canonical detail with provenance: `references/principles.md`; inheritance
  metadata: `adapter.yaml`; design references: `references/inspiration-sources.md`.

## The canon, applied to a rental site

**What every page serves — the guest's questions, in their order:**

- A visitor arrives with checkable questions: for how many, what does it look like,
  where is it, when is it free, what does it cost, how do I ask. Every page answers
  its share of these before anything else; Luuk & Wanda's goals travel inside that
  service [CP-021, CP-035].
- Page tops answer in seconds: what this is, for whom, why it's lovely — then the
  payload, front-loaded. The hero is the verblijf, not a slogan [CP-012, CP-026].

**Trust mechanics (a rental's core job):**

- Show, don't assert: real photos, the feitenblad, the veranda measured in use, the
  walk to the beach in minutes. The guest concludes "genuine" themselves [CP-015].
- Every claim survives a skeptical parent planning a family week: amenities only
  from the feitenblad, the 4★ always attributed to Camping Le Conguel, never to
  Ty LuWa [CP-019]. No reviews exist, so none appear — absence of testimonials is
  more trustworthy than invented ones [CP-015, CP-019].
- Goodwill economics: the request model IS the goodwill — no account walls, no
  payment pressure, an honest note that the form's backend status is what it is;
  every friction the guest pays drains the warmth the brand runs on [CP-036].
- One voice: Luuk & Wanda, warm, personal, Dutch-first — hosts, never a rental
  factory [CP-009]. The guest is the hero of the story (their week at the coast);
  the site is the guide [CP-017].

**The request flow (the one conversion, honestly):**

- One next step per page: the availability request, phrased as a visible act; every
  page ends by pointing at it exactly once [CP-013].
- The flow is self-evident: no thought spent on what a field wants, what happens
  after sending, or whether dates are dd-mm or mm-dd; question marks are defects
  [CP-029, CP-030]. Interface words are designed, minimal, in the guest's own
  vocabulary per language — site-content.json is a copy surface, not a string
  dump, and each language is edited as its own text [CP-027, CP-047].
- Conventions leveraged by default: availability calendars, photo galleries and
  request forms look like what guests already know from good rental sites;
  departures need a reason [CP-031, CP-032].
- Navigation as place-making: every language's translated slugs (verblijf,
  the-house, le-logement, unterkunft) self-locate; a guest landing mid-site from a
  shared link knows where they are — run the trunk test per domain [CP-033].

**Visual calm (their system, grounded):**

- The design system's calm is engineered from space: start roomy, group by
  proximity, borders last [CP-040]. One primary action per page; hierarchy through
  de-emphasis [CP-038].
- Type set for holiday reading: comfortable measures, Lora for warmth where the
  system says so, left-aligned body [CP-041]. Meaning never carried by color alone
  — availability states get a second channel [CP-043].
- Photos are content, not decoration: chosen for the guest's questions (sleeping,
  cooking, veranda, light), honest to the current provisional-set status
  [CP-015, CP-022].

**Explanation craft (practical pages):**

- Arrival info, house rules and camping context follow explanation canon: assume
  nothing, one need-ordered step at a time, terms explained at first use, short
  sentences that survive a first pass [CP-016, CP-028]. Scanning structure: heading
  skeletons that tell the story alone [CP-025].

## Critique checklist

- Which of the guest's checkable questions does this page answer, and does anything
  precede those answers? [CP-021, CP-012]
- Would this claim survive the skeptical parent — and is every amenity in the
  feitenblad? [CP-019]
- Headings-only read, per language: does the page still work? [CP-025, CP-026]
- Whose words — the guest's or the owner's? Per language? [CP-027]
- Where does the request flow make a guest think, doubt or wait unexplained?
  [CP-029, CP-030, CP-036]
- Blur test: is the one primary action visually primary? [CP-038]
- Does this feel like Luuk & Wanda, or like a booking machine? [CP-009]

## Never

- Never dark-pattern conversion: no fake reviews, fake scarcity, countdowns, "x
  mensen kijken nu" — repo law, and the canon's hardest guardrail [CP-037, CP-036].
- Never invent amenities, availability, or classifications; the 4★ belongs to the
  camping [CP-019].
- Never suggest automatic booking while the backend doesn't exist; the form's real
  status stays honest on the page [CP-019, CP-036].
- Never publish filler pages to look bigger — the publish gate (utility, grounding,
  empathy) applies [CP-022].
- Never judge with adjectives — cite the element and the mechanism [CP-020].
