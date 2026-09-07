<!-- Grounding references for adapter 'craft-grounding' in repo 'ty-luwa (E:\Websites\ty-luwa, remote DogodaBjorn/ty-luwa - live site, drie domeinen, vier talen; Luuk & Wanda's mobil-home op Camping Le Conguel, Quiberon; aanvraag-model, geen boekingsmachine)'.
     Producer: BookCompiler (E:\bookcompiler) · bundle: bundle_v1_full-corpus · canonical schema 1.0.0.
     Regenerate after bundle updates: .venv\Scripts\python.exe tools\ground_repo.py <this adapter.yaml>
     Contract: docs/INTEGRATION_CONTRACT.md - paraphrased canonical knowledge with page-level provenance; no source-book content. -->

# Canonical principles behind `craft-grounding`

Full operational detail and provenance for every principle this skill cites. Consult on demand; SKILL.md stays concise.

## [CP-021] Audience-first - serve the researched need, not the organisation's message

**Statement.** Decide what to make, say and show from the audience's researched need and situation: turn what the organisation wants to push into what the audience is already trying to find, phrase it as "you" not "we", resolve internal-versus-reader conflicts in the reader's favour, and carry the organisation's goals inside content that serves the need - never instead of it.

**Why.** Audiences owe you nothing; content is used only when it meets a need on the audience's terms. Three sources state this as their foundational doctrine (content design's needs-not-wants, Handley's reader-first resolution and we→you, Krug's stop-making-users-pay-for-your-convenience), making it the corpus's central service principle.

**Apply when**
- planning or reviewing any audience-facing content or feature
- internal stakeholders push messages the audience did not ask for

**Do not apply when**
- personal/expressive writing where the writer's own stake is the point (see tension below)

**Rules**
- rewrite push into pull: find the audience's own motive for the thing and lead with it
- resolve stakeholder-vs-reader conflicts for the reader, and argue the case internally
- replace 'we' framing with the reader's situation and outcome until they recognize themselves
- keep organisational goals inside the need-meeting content, never in its place

**Diagnostics**
- what researched need does this serve - and where is the evidence for it?
- who is the grammatical subject of these sentences - us, or the reader?

**Transformations**
- 'we are proud to announce…' → what the reader can now do, and why they'd care

**Anti-patterns**
- publishing to fill slots or satisfy internal requests; org-chart language and structure exposed to the audience

**Evaluation criteria**
- a reader can say what's in it for them within seconds; stakeholder goals are met through the need, invisibly

**Tensions / disagreements**
- Service writing vs expressive writing: audience-first governs content made to be used; write-for-yourself governs content made to be felt. Misapplying either doctrine to the other's territory produces pandering essays or self-absorbed service content.

**Support.** 4 independent source(s) · confidence: high (Four supporting sources with one context-bounded dissent, preserved.)

**Provenance.**
- `CDE-002` (supports) — *Content Design*, “Introduction”, pp. 32–33
- `CDE-003` (supports) — *Content Design*, “Preparation”, pp. 50–51
- `EWR-016` (supports) — *Everybody writes*, “Part I Writing Rules”, pp. 53–76
- `EWR-019` (specializes) — *Everybody writes*, “Part I Writing Rules”, pp. 80–102
- `DMMT-046` (reinforces) — *Don't Make Me Think, Revisited*, “LARGER CONCERNS AND OUTSIDE INFLUENCES”, pp. 179–182
- `OWW-041` (contextualizes) — *On Writing Well*, “Part III: Forms”, pp. 84–89
- `OWW-010` (**contradicts**) — *On Writing Well*: Zinsser's "write for yourself" - on attitude and taste, please yourself, not an imagined audience. Bounded: Zinsser splits craft (reader's, absolute) from attitude (writer's, free) and aims at personal/editorial writing; the audience-first doctrine governs service and commercial content. Both reject pandering; they disagree on whose interest steers topic and stance.

## [CP-035] Research the audience before making - assumption is bias

**Statement.** Establish who the audience is, what they need, how they feel and what words they use - from evidence, before creating anything: run discovery with all knowledge in one room, listen where the audience already talks, have real contact with real customers, map their whole journey from the prompt that started it, and treat your own familiarity with the organisation as bias, not knowledge.

**Why.** Three sources independently make research the precondition of good making: content design (discovery, journeys, mental models), marketing (empathy as a work programme, not an attitude) and usability (watch someone instead of arguing). The recurring enemy is the same: the maker's assumption standing in for the audience's reality.

**Apply when**
- before creating or redesigning anything audience-facing; when teams argue from assumption

**Rules**
- identify the audience and their needs before drafting anything; write needs in a fixed story shape
- map the journey from the prompt (the thought or event that started the search), including channels you don't control and the mental model they carry
- build empathy by contact - conversations, their own channels, their words beside your metrics
- stop initial research when behavioral patterns form (~5 people), and carry them as working assumptions, not truths

**Diagnostics**
- what evidence - not intuition - says the audience needs this, in these words?

**Transformations**
- 'we know our users' → a journey map, a need statement and quotes from real contact

**Anti-patterns**
- skipping research because the team is the target audience; personas invented in a workshop with no contact behind them

**Evaluation criteria**
- every content/design decision can cite its research; audience words appear verbatim in the work

**Support.** 3 independent source(s) · confidence: high (Three independent sources.)

**Provenance.**
- `CDE-010` (supports) — *Content Design*, “Preparation”, pp. 87–92
- `CDE-008` (specializes) — *Content Design*, “Preparation”, pp. 82–86
- `CDE-019` (specializes) — *Content Design*, “Preparation”, pp. 126–138
- `CDE-022` (specializes) — *Content Design*, “Preparation”, pp. 142–149
- `EWR-018` (reinforces) — *Everybody writes*, “Part I Writing Rules”, pp. 78–80
- `DMMT-032` (reinforces) — *Don't Make Me Think, Revisited*, “MAKING SURE YOU GOT THEM RIGHT”, pp. 114–120

## [CP-012] The opening must seize immediately and say why it matters

**Statement.** Make the first unit compel the second: hook with freshness, surprise, a recognized pain or a striking concrete fact; within seconds give the audience the hard reason this exists and why they should stay; and delete the running start you needed to get going - on task-driven pages this means answering "what is this, what can I do here, where do I start" at a glance.

**Why.** If sentence one doesn't produce sentence two, the piece is dead; most reading happens in stolen moments and most page visits begin mid-site. Editorial sources emphasize seduction, the web sources emphasize orientation - both are the same first-seconds contract: earn and justify attention immediately.

**Apply when**
- writing or reviewing the first paragraphs of anything, or a page's top region

**Do not apply when**
- audiences with an explicit slow-opening contract (rare; don't count on their patience)

**Rules**
- open inside the event, with a proven lead move (scene, named pain, question you'll answer, startling number, odd angle, analogy) - or with the answer, for task content
- by the opening's end, the audience knows why this exists and why to stay
- after drafting, cut the warm-up paragraphs; start where the actual content begins
- end early paragraphs with a small twist that springs the reader forward

**Diagnostics**
- where does the real story begin in this draft - and what is everything before it for?
- could a stranger say, from the first seconds, what this is and why it matters?

**Transformations**
- context-first opening → tension or payload in unit one, context demoted below
- warm-up paragraphs → deleted (the running start)

**Anti-patterns**
- stock leads (the visitor from Mars, the have-in-common list); manufactured atmosphere while the story hides below; welcome blurbs

**Evaluation criteria**
- a test reader, given only the first unit, wants the second - and can state why the piece matters

**Tensions / disagreements**
- Hook-first (Zinsser, Handley) vs answer-first (Krug; also CDE's orientation rules, see CP-026): for editorial content the opening seduces before it explains; for task content curiosity-gaps are hostile and the answer IS the hook. Choose by the audience's mode - reading for interest vs trying to get something done.

**Support.** 3 independent source(s) · confidence: high (Three independent sources.)

**Provenance.**
- `OWW-018` (supports) — *On Writing Well*, “Part II: Methods”, pp. 35–38
- `OWW-020` (contextualizes) — *On Writing Well*, “Part II: Methods”, p. 37
- `EWR-024` (supports) — *Everybody writes*, “Part I Writing Rules”, pp. 101–105
- `EWR-021` (reinforces) — *Everybody writes*, “Part I Writing Rules”, pp. 92–95
- `DMMT-029` (reinforces) — *Don't Make Me Think, Revisited*, “THINGS YOU NEED TO GET RIGHT”, pp. 99–110

## [CP-026] Front-load the payload - in headings, sentences and pages

**Statement.** Put the most important words and information first at every level: headings open with their key words and say plainly what the reader gets; sentences open with actor and action; the top of a page confirms the reader is in the right place and carries what most of the audience came for; headlines are 90% clear before they are 10% clever.

**Why.** Scanners decide from openings; front-loading is how content survives the F-pattern, the search results page and the feed. Curiosity-gap headings and back-loaded sentences tax exactly the attention the audience hasn't granted yet.

**Apply when**
- writing any heading, headline, page opening or scannable unit

**Do not apply when**
- deliberately literary openings for committed-reading contexts (see CP-012's tension)

**Rules**
- key words first in every heading; the heading states what the reader can get or do
- the page top: confirm right place + deliver what ~80% came for; the rest findable below
- open sentences with subject and verb; move framing clauses behind them
- headline: understandable alone, the reader inside it, specific about the payoff

**Diagnostics**
- truncate each heading after three words - does the payload survive?
- what fraction of the audience finds their answer above the fold?

**Transformations**
- 'Everything you need to know about X' → the actual answer/promise, keyworded first

**Anti-patterns**
- teaser headings; joke-first labels; context paragraphs before the point; buried subjects

**Evaluation criteria**
- headings scan as promises kept; first lines carry actors and payloads

**Support.** 2 independent source(s) · confidence: high (Two independent sources, mechanically compatible.)

**Provenance.**
- `CDE-032` (supports) — *Content Design*, “Design”, pp. 196–198
- `CDE-033` (supports) — *Content Design*, “Design”, pp. 198–199
- `EWR-022` (reinforces) — *Everybody writes*, “Part I Writing Rules”, pp. 96–98
- `EWR-062` (specializes) — *Everybody writes*, “Part VI 20 Things Marketers Write”, pp. 339–344

## [CP-015] Trust the material - show it, and skip the nudge

**Statement.** Let significant facts, moments and named specifics do their own work: replace assertions with the concrete detail that lets the audience conclude the claim themselves, cut explanations of what they already know or can infer, drop value-stamping framers ("surprisingly", "amazingly", "of course"), and instruct without preaching.

**Why.** The audience plays an active role and must be given room to play it; the self-sufficient specific produces the reader's own marveling and their own conviction, which are stronger than the writer's imported awe or sermon. Color is organic to the fact.

**Apply when**
- a striking fact is followed by its own explanation; adverbs are rating the content
- a claim is asserted where a specific would prove it

**Do not apply when**
- genuine mechanism explanation is needed for comprehension

**Rules**
- deliver the fact plainly and stop; no slow-motion on the home run
- replace the descriptive claim with the named specific: the actual thing, not its category
- rewrite commandment-openers (never / don't / always remember) as actionable information

**Diagnostics**
- which sentences tell the audience how to feel about the previous sentence?
- which claims could a named specific replace?

**Transformations**
- 'Amazingly, X' → 'X'
- 'our support is world-class' → the 90-second median response time, stated

**Anti-patterns**
- over-explaining; exclamation as significance marker; moralizing instruction

**Evaluation criteria**
- striking facts stand bare; claims arrive as specifics; no value-stamping adverbs survive

**Support.** 2 independent source(s) · confidence: high (Two independent sources with worked demonstrations.)

**Provenance.**
- `OWW-034` (supports) — *On Writing Well*, “Part II: Methods”, pp. 51–131
- `EWR-026` (reinforces) — *Everybody writes*, “Part I Writing Rules”, pp. 107–113
- `EWR-041` (specializes) — *Everybody writes*, “Part II Writing Rules: Grammar and Usage”, pp. 190–191

## [CP-019] Never overstate - credibility is a one-strike asset

**Statement.** Keep every claim at the size of the truth: no inflated incidents, manufactured intensities or unearned superlatives; verify names, figures, dates and arithmetic against primary sources before publishing; correct errors visibly - because one statement the audience catches as bogus poisons everything after it, and commercial content is suspected before it is read.

**Why.** Credibility is fragile and non-renewable within a piece; exaggeration also numbs. Handley extends Zinsser's rule into infrastructure (fact-checking, primary sourcing, visible corrections, publisher standards stricter than a newsroom's) because a commercial motive raises the burden of proof; content design adds that visible quality - down to spelling - is a condition of being trusted at all.

**Apply when**
- drafting anything tempted toward exaggeration; reviewing claim-heavy copy; publishing under a brand

**Do not apply when**
- declared satire/parody where heightening is the visible device, kept under control

**Rules**
- report incidents at actual size; cut fabricated intensities
- every factual claim must survive the challenge: really? - and trace to its original source
- cite while you write; correct visibly when wrong

**Diagnostics**
- which sentence would I not defend as literally true or clearly figurative?
- which claims have I actually traced to a primary source?

**Transformations**
- hyperbolic scene → the actual odd detail (stranger and funnier)

**Anti-patterns**
- superlative stacking; sourcing from whoever reposted it; silent corrections

**Evaluation criteria**
- claims all survive scrutiny and sourcing; effects land without volume

**Support.** 3 independent source(s) · confidence: high (Three independent sources.)

**Provenance.**
- `OWW-029` (supports) — *On Writing Well*, “Part II: Methods”, pp. 45–46
- `EWR-056` (reinforces) — *Everybody writes*, “Part V Publishing Rules”, pp. 274–347
- `EWR-049` (reinforces) — *Everybody writes*, “Part V Publishing Rules”, pp. 245–247
- `CDE-004` (contextualizes) — *Content Design*, “Preparation”, pp. 52–54

## [CP-036] Manage the goodwill reservoir - trust is spent and refilled by design

**Statement.** Model every audience interaction as drawing on a limited reservoir of goodwill: each hidden fact, punishing rule, needless question, default gate, trap or sloppy detail drains it; each visibly user-first act - candor, saved steps, easy exits, help leaving when you can't help, value delivered before anything is asked - refills it. Treat the reservoir as a live design lever, and never assume a reserve.

**Why.** Krug's goodwill model, content design's leave-fast doctrine and trust conditions, and Handley's relationship-gating converge: audiences keep score of whose interest the artifact serves, and the score governs everything else you attempt.

**Apply when**
- designing any interaction with friction, gates, errors or asks

**Rules**
- remove the drains: hidden information, punishing input formats, unnecessary questions, faux sincerity, traps on exit
- add the refills: candor, saved steps, graceful error exits, unobtrusive escape routes for people you cannot help
- gate value by relationship stage - deliver first, ask after; default-gating is a drain

**Diagnostics**
- what does this step cost the user for our convenience - and what would refill it?

**Transformations**
- email-wall before value → value first, ask after; confirmation-trap on exit → clean exit + alternative

**Anti-patterns**
- spending goodwill as if brand equity were infinite; punishing users for organizational structure

**Evaluation criteria**
- each interaction audited for drains/refills; no step exists purely for the org's convenience

**Support.** 3 independent source(s) · confidence: high (Three independent sources.)

**Provenance.**
- `DMMT-045` (supports) — *Don't Make Me Think, Revisited*, “LARGER CONCERNS AND OUTSIDE INFLUENCES”, pp. 176–178
- `DMMT-046` (specializes) — *Don't Make Me Think, Revisited*, “LARGER CONCERNS AND OUTSIDE INFLUENCES”, pp. 179–182
- `CDE-034` (reinforces) — *Content Design*, “Preparation / Design”, pp. 118–200
- `EWR-052` (reinforces) — *Everybody writes*, “Part V Publishing Rules”, pp. 257–260

## [CP-027] Use the audience's own words - everywhere words appear

**Statement.** Build sentences, headings, labels, buttons and navigation from the vocabulary the audience already uses and searches for - familiar, plain, short words; the search terms they actually type; the ordinary name for the thing - and reject clever, invented, internal, inflated or fashionable vocabulary even when politics or tradition favor it.

**Why.** Familiar words are recognized in a single eye fixation; unfamiliar ones cost measurable time and, in interfaces, force thought. Four corpus sources arrive at this rule independently - from prose craft, reading science, search behavior, interface labeling and marketing register - making it the strongest word-level convergence in the corpus.

**Apply when**
- choosing any word an audience will read - especially labels, headings and calls to action

**Do not apply when**
- a term of art is genuinely the audience's own vocabulary (specialists reading specialist content)

**Rules**
- prefer the short, plain, everyday word; swap Latinate inflation for its plain equivalent
- find the words the audience actually types and says (search data, their channels) and use those on the page
- label things with the ordinary name, not the clever, branded or internal one
- strip buzzwords, bulked-up abstractions and machine vocabulary applied to people

**Diagnostics**
- would the audience say this word? do they search for it? would they recognize it at a glance?
- which labels here exist for internal pride rather than audience recognition?

**Transformations**
- 'Solutions' navigation → what the things actually are, in the audience's words
- 'utilize/leverage/facilitate' → 'use/help/ease'

**Anti-patterns**
- marketing-invented names for standard things; org-chart vocabulary in navigation; jargon as sophistication signal

**Evaluation criteria**
- audience members name things the same way the artifact does; search vocabulary and page vocabulary match

**Support.** 4 independent source(s) · confidence: high (Four independent sources including empirical grounding.)

**Provenance.**
- `OWW-007` (supports) — *On Writing Well*, “Part I: Principles / Part II: Methods”, pp. 16–115
- `CDE-006` (reinforces) — *Content Design*, “Preparation”, pp. 64–67
- `CDE-011` (specializes) — *Content Design*, “Preparation”, pp. 87–201
- `DMMT-005` (specializes) — *Don't Make Me Think, Revisited*, “GUIDING PRINCIPLES”, pp. 25–148
- `EWR-036` (reinforces) — *Everybody writes*, “Part II Writing Rules: Grammar and Usage”, pp. 153–157

## [CP-023] Write to one named reader

**Statement.** Address every piece to one specific, imaginable person: devote a revision pass to a named reader - checking they can follow the logic, find their questions answered and see themselves in the text - and write serial formats (newsletters, posts) as a letter from one person to one person.

**Why.** There is no mass audience to visualize - every reader is one person. The named-reader pass converts vague "audience awareness" into checkable questions, and the letter-to-one stance produces the warmth broadcasting kills.

**Apply when**
- revising anything audience-facing; writing serial or relationship formats

**Rules**
- name the reader (a real person or a researched composite); run one full pass as them
- serial formats: one person writing to one person, mostly insight, barely any promotion

**Diagnostics**
- can my named reader follow, get answers, and see themselves here?

**Transformations**
- broadcast blast → letter to the one reader it's really for

**Anti-patterns**
- writing to a demographic; visualizing the great mass audience

**Evaluation criteria**
- the named reader's three checks pass; the piece reads as addressed, not broadcast

**Support.** 2 independent source(s) · confidence: medium (One source's explicit method plus a second's supporting stance.)

**Provenance.**
- `EWR-015` (supports) — *Everybody writes*, “Part I Writing Rules”, pp. 63–77
- `EWR-059` (specializes) — *Everybody writes*, “Part VI 20 Things Marketers Write”, pp. 311–323
- `OWW-009` (contextualizes) — *On Writing Well*, “Part I: Principles”, pp. 19–49

## [CP-029] Make it self-evident - remove the question marks

**Statement.** Hold every page and screen to the self-evidence standard: a person of average ability can tell what it is, what they can do and how to use it just by looking; treat every question a user must stop and answer as a defect to remove; settle for self-explanatory (a little thought, well-crafted names and tiny text) only for the genuinely novel or inherently complicated.

**Why.** Krug's First Law and its calibrated fallback: usable means figuring it out without more trouble than it's worth. Question marks compound into abandonment even when each one is small.

**Apply when**
- designing or reviewing any interactive surface or task page

**Rules**
- eliminate the question at its source (design/naming), don't answer it with explanation
- reserve instructional text for the genuinely novel, kept minimal and adjacent

**Diagnostics**
- walk the surface asking at each element: what would a first-time user wonder here?

**Transformations**
- explanatory tooltip on a confusing control → the control redesigned so no tooltip is needed

**Anti-patterns**
- answering confusion with more copy; tolerating small question marks as minor

**Evaluation criteria**
- a first-time user narrates the surface correctly at a glance; no stops

**Support.** 1 independent source(s) · confidence: medium (One source, argued as the book's thesis.)

**Provenance.**
- `DMMT-004` (supports) — *Don't Make Me Think, Revisited*, “GUIDING PRINCIPLES”, pp. 22–27
- `DMMT-007` (contextualizes) — *Don't Make Me Think, Revisited*, “GUIDING PRINCIPLES”, pp. 29–30
- `DMMT-003` (contextualizes) — *Don't Make Me Think, Revisited*, “INTRODUCTION: Read me first”, pp. 20–199

## [CP-030] Minimize thought per step, not the number of steps

**Statement.** Optimize how hard each step is, not how many there are: people happily take many steps when each is mindless and they stay confident of being on the right path - so make every choice answerable without thought, stage complex choices, keep the scent of "yes, this way" alive at each step, and supply guidance only where a choice is genuinely hard - brief, timely, unavoidable.

**Why.** Krug's Second Law and content design's scent-of-information doctrine (against the three-click rule) independently overturn the same false metric: click/step counting. Abandonment tracks doubt and effort per step, not step totals.

**Apply when**
- designing or judging any multi-step path; someone invokes a click-count rule

**Do not apply when**
- steps that add nothing for the user (then depth really is the problem - each step must pay the user)

**Rules**
- split hard choices into staged mindless ones rather than presenting all conditions at once
- make every link/label confirm what comes next in the audience's words
- guidance rules: brief, at the moment of need, impossible to miss - and only where genuinely needed

**Diagnostics**
- at each step, can the user tell they're still on the right path - without thinking?
- which single step carries the most doubt, and why?

**Transformations**
- flattened cram-navigation (three-click rule) → deeper path with unmistakable scent at each step

**Anti-patterns**
- click-count optimization; all-conditions-up-front mega-choices; generic 'next/more' labels

**Evaluation criteria**
- a test user narrates confidence at every step; hesitations cluster nowhere

**Support.** 2 independent source(s) · confidence: high (Two independent sources.)

**Provenance.**
- `DMMT-017` (supports) — *Don't Make Me Think, Revisited*, “GUIDING PRINCIPLES”, p. 54
- `DMMT-018` (specializes) — *Don't Make Me Think, Revisited*, “GUIDING PRINCIPLES”, pp. 55–58
- `CDE-035` (reinforces) — *Content Design*, “Design”, pp. 200–201

## [CP-033] Navigation is place-making - persistent, self-locating, promise-keeping

**Statement.** Treat navigation as the thing that gives an information space a sense of place: a persistent kit (identity, sections, utilities, search, Home) in the same place on every page; a prominent page name matching the link that led there; location cues about twice as loud as feels tasteful; and labels that keep the scent - each one confirming, in the audience's words, what comes next.

**Why.** People arrive anywhere and are always partly lost; navigation does five jobs at once (find, locate, orient, teach, reassure). Matching page names to clicked links and amplified you-are-here cues are what let users trust the path; designers reliably underestimate how loud location cues must be.

**Apply when**
- designing or auditing any multi-page structure

**Do not apply when**
- focused form/checkout pages, where navigation strips to the minimal version

**Rules**
- persistent kit on every page except forms; design navigation for the deepest levels before visual debates
- page name = the words on the link that led there, placed to frame the page's unique content
- mark current location with more than one visual distinction, at double the tasteful volume
- labels confirm the destination in audience vocabulary (scent), never the owning department

**Diagnostics**
- trunk test a random deep page: site? page? sections? options? where am I? how to search?

**Transformations**
- department-named sections → audience-task-named sections

**Anti-patterns**
- navigation grafted on after visual design; subtle location cues; link text ≠ destination name

**Evaluation criteria**
- the trunk test passes on random deep pages at arm's length

**Support.** 2 independent source(s) · confidence: high (Two independent sources; includes its own test instrument.)

**Provenance.**
- `DMMT-021` (supports) — *Don't Make Me Think, Revisited*, “THINGS YOU NEED TO GET RIGHT”, pp. 72–74
- `DMMT-022` (specializes) — *Don't Make Me Think, Revisited*, “THINGS YOU NEED TO GET RIGHT”, pp. 76–81
- `DMMT-025` (specializes) — *Don't Make Me Think, Revisited*, “THINGS YOU NEED TO GET RIGHT”, pp. 85–87
- `DMMT-026` (specializes) — *Don't Make Me Think, Revisited*, “THINGS YOU NEED TO GET RIGHT”, pp. 88–91
- `DMMT-028` (specializes) — *Don't Make Me Think, Revisited*, “THINGS YOU NEED TO GET RIGHT”, pp. 93–94
- `CDE-035` (reinforces) — *Content Design*, “Design”, pp. 200–201

## [CP-038] Rank first, then style - hierarchy is deliberate de-emphasis

**Statement.** Before styling anything, explicitly rank the elements (primary, secondary, tertiary), then make prominence express the ranks - mostly by actively de-emphasizing the non-primary (weight, color, contrast) rather than shouting the primary louder; make visual relationships portray actual relationships (related things look related, nested things look contained), and break every page into regions a viewer could name at a glance.

**Why.** When everything is emphasized nothing is; shouting is the symptom of an unmade ranking decision. Both design sources state the same two-step - decide importance, then let appearance preprocess the page - and both make de-emphasis the workhorse.

**Apply when**
- designing or critiquing any visual surface; a page feels busy or flat

**Rules**
- one true primary action/element per surface; secondary and tertiary actively softened
- use weight and color before size for text emphasis; trade surface area against contrast to balance
- style actions by page-rank, not semantics; loud destructive styling belongs at the confirmation step
- group into nameable regions; give hierarchy a visible containment logic

**Diagnostics**
- blur test: what pops, in what order - and is that the intended ranking?
- can a viewer point at and name each region of this page?

**Transformations**
- everything bold and branded → one primary, the rest quietly legible

**Anti-patterns**
- emphasis inflation; shouting as unmade decisions; severity-styled buttons regardless of page role

**Evaluation criteria**
- the blur test returns the intended ranking; regions are nameable at a glance

**Support.** 2 independent source(s) · confidence: high (Two independent sources with compatible tests.)

**Provenance.**
- `RUI-009` (supports) — *Refactoring UI*, “Hierarchy is Everything”, pp. 30–31
- `RUI-013` (specializes) — *Refactoring UI*, “Hierarchy is Everything”, pp. 39–40
- `RUI-010` (specializes) — *Refactoring UI*, “Hierarchy is Everything”, pp. 32–33
- `RUI-017` (specializes) — *Refactoring UI*, “Hierarchy is Everything”, pp. 48–51
- `RUI-018` (specializes) — *Refactoring UI*, “Hierarchy is Everything”, pp. 52–53
- `RUI-019` (specializes) — *Refactoring UI*, “Hierarchy is Everything”, p. 54
- `DMMT-013` (reinforces) — *Don't Make Me Think, Revisited*, “GUIDING PRINCIPLES”, pp. 44–47
- `DMMT-014` (reinforces) — *Don't Make Me Think, Revisited*, “GUIDING PRINCIPLES”, p. 47

## [CP-040] Start with too much space - and let space do the grouping

**Statement.** Give every element far more breathing room than seems necessary, then remove space until satisfied - never add space until things stop looking cramped; keep more space around a group than inside it so proximity alone communicates belonging; give elements only the width their content needs; and prefer space (or background/shadow shifts) to borders as the separator.

**Why.** Cramped is the default failure; the subtract-from-generous direction produces calm layouts the add-when-cramped direction never reaches. Grouping-by-space is the visual version of the prose tradition's air-around-type: density repels, air invites.

**Apply when**
- laying out anything; a design feels crowded or noisy

**Do not apply when**
- genuinely dense-by-purpose surfaces (data tables users came to scan)

**Rules**
- start roomy, subtract to taste; white space is removed, not added
- space-around-group > space-within-group, both axes
- content-driven widths; empty canvas is not a problem to fill
- separators in order: space, background change, shadow - border last

**Diagnostics**
- is any spacing inside a group larger than the spacing around it?
- what was added to this layout only because the canvas looked empty?

**Transformations**
- border-separated cramped panels → space-separated calm groups

**Anti-patterns**
- filling width because it exists; border-on-border separation; cramped-by-default forms

**Evaluation criteria**
- groups read at a glance from proximity alone; nothing exists to fill space

**Support.** 3 independent source(s) · confidence: high (Three sources across disciplines.)

**Provenance.**
- `RUI-020` (supports) — *Refactoring UI*, “Layout and Spacing”, pp. 56–59
- `RUI-027` (specializes) — *Refactoring UI*, “Layout and Spacing”, pp. 83–86
- `RUI-022` (specializes) — *Refactoring UI*, “Layout and Spacing”, pp. 65–71
- `RUI-058` (specializes) — *Refactoring UI*, “Finishing Touches”, pp. 206–209
- `DMMT-014` (reinforces) — *Don't Make Me Think, Revisited*, “GUIDING PRINCIPLES”, p. 47
- `OWW-031` (contextualizes) — *On Writing Well*, “Part II: Methods”, p. 47

## [CP-041] Set type for the reading eye

**Statement.** Size and set text for how eyes actually read: 45-75 characters per line (roughly 20-35em), line-height rising with line length and falling with font size, baseline alignment for mixed sizes, left-aligned body text in LTR languages, sentence case and familiar letterforms, and letter-spacing left to the typeface designer except for repurposed display type and all-caps.

**Why.** Typography's job is uninterrupted reading: the eye must find the return path, hold the line, and recognize word shapes at speed. Both design-adjacent sources ground these in reading mechanics rather than aesthetics.

**Apply when**
- setting any body text or reviewing text-heavy surfaces

**Do not apply when**
- display/expressive type where reading endurance isn't the job

**Rules**
- hold paragraph measure at 45-75 characters even when the layout is wider
- line-height: ~1.5 narrow up to ~2 wide; down toward 1 for large headlines
- align mixed-size text on baselines; centre only short blocks; right-align numbers in tables; hyphenate if justifying
- reject typographic treatments whose only effect is making familiar words unfamiliar

**Diagnostics**
- can the eye find the start of the next line without effort?

**Transformations**
- full-width body text → constrained measure inside the wide layout

**Anti-patterns**
- all-caps body text; centered paragraphs; one global line-height

**Evaluation criteria**
- sustained reading passes without line-loss; measure and leading sit in the evidence bands

**Support.** 2 independent source(s) · confidence: high (Two independent sources.)

**Provenance.**
- `RUI-031` (supports) — *Refactoring UI*, “Designing Text”, pp. 99–101
- `RUI-033` (specializes) — *Refactoring UI*, “Designing Text”, pp. 105–108
- `RUI-032` (specializes) — *Refactoring UI*, “Designing Text”, pp. 102–104
- `RUI-035` (specializes) — *Refactoring UI*, “Designing Text”, pp. 111–114
- `RUI-036` (specializes) — *Refactoring UI*, “Designing Text”, pp. 115–117
- `CDE-007` (reinforces) — *Content Design*, “Preparation”, pp. 68–71

## [CP-009] Be a recognizable person on the page - one voice, no costume

**Statement.** Write and publish as an identifiable human being with one consistent voice across subjects and channels - relaxed, plain and inclusive by default, never grafted-on style, breezy fake chumminess, institutional facade or jargon armor - and never write what you wouldn't comfortably say to the audience's face.

**Why.** The writer's identity is the product; audiences identify with people and leave when patronized or faced with a facade. The "effortless" personal style is strenuous formal craft underneath. The marketing tradition independently lands here: one person talking, in every channel, down to the smallest microcopy.

**Apply when**
- drafting anything audience-facing; reviewing copy that sounds like a committee or a costume

**Do not apply when**
- formats that legitimately suppress authorship (hard news, legal text) - keep humanity within the rules

**Rules**
- default to first person where permitted; think "I" (or address "you") where not
- keep one voice across topics and channels; move tone, not voice, to fit the moment
- read aloud as the test: would you say this sentence to the audience's face?
- translate every jargon sentence into what it actually means

**Diagnostics**
- who is talking here - a person or a facade? the same person as the last piece?

**Transformations**
- 'enhanced positive learning environments' → what the school will actually do, said by a person
- bare link share → the same link with why you're passing it on, said as you'd say it

**Anti-patterns**
- decorating prose to seem special; just-folks breeziness; "one finds"; channel-broadcasting with no person behind it

**Evaluation criteria**
- samples across topics and channels are attributable to one person; a customer can restate the message

**Support.** 2 independent source(s) · confidence: high (Two independent traditions, many internal restatements each.)

**Provenance.**
- `OWW-008` (supports) — *On Writing Well*, “Part I: Principles”, pp. 18–19
- `OWW-009` (reinforces) — *On Writing Well*, “Part I: Principles”, pp. 19–49
- `OWW-044` (reinforces) — *On Writing Well*, “Part IV: Attitudes”, pp. 112–113
- `OWW-041` (specializes) — *On Writing Well*, “Part III: Forms”, pp. 84–89
- `OWW-001` (contextualizes) — *On Writing Well*, “Part I: Principles”, pp. 9–10
- `EWR-004` (supports) — *Everybody writes*, “Start Here”, pp. 31–33
- `EWR-042` (specializes) — *Everybody writes*, “Part III Voice Rules”, pp. 199–213
- `EWR-064` (specializes) — *Everybody writes*, “Part VI 20 Things Marketers Write”, pp. 352–377

## [CP-013] End deliberately - complete, don't trail off, never echo-summarize

**Statement.** End when the piece is done, on a note that adds or lands something - a synthesis that says something new, a surprise, a full-circle echo, a source's closing line, or exactly one next step - and never wind down by restating what was just said or trailing off when the material runs out.

**Why.** Summary endings repeat the piece in compressed form; readers hear the cranking and quit, and the last unit is what lingers. Both writing sources ban the echo-conclusion; they differ on whether the close may synthesize (Handley: yes, if it adds) or should simply exit (Zinsser: nearest exit) - preserved below as a bounded difference.

**Apply when**
- drafting or reviewing final sections; a "conclusion" begins to form

**Do not apply when**
- formats requiring an executive summary (put it first, not as the ending)

**Rules**
- when ready to stop, stop - even against the actual chronology of events
- give the last unit nearly first-unit care; if a next step exists, name exactly one
- a closing synthesis must say something the piece had not yet said - never a paraphrase of the opening

**Diagnostics**
- what is the last genuinely new thing said - and why isn't that (or its landing) the ending?
- does the final paragraph add, or merely stop / merely repeat?

**Transformations**
- 'In sum…' paragraph → deleted; end on the strongest final fact or line
- trailing off after the last point → one synthesized takeaway plus one concrete next step

**Anti-patterns**
- conclusions that conclude repeatedly; the fade-out; stacked calls to action so the reader chooses none

**Evaluation criteria**
- the ending lands and stays in the ear; nothing after the last new idea; at most one next step

**Tensions / disagreements**
- Nearest-exit (Zinsser) vs crafted kicker with next step (Handley): editorial essays end on resonance; marketing content usually owes the reader a pointer. Both forbid restating the piece. Choose by whether the reader has a next action to take.

**Support.** 2 independent source(s) · confidence: high (Two independent sources with explicit rules and named anti-patterns.)

**Provenance.**
- `OWW-022` (supports) — *On Writing Well*, “Part II: Methods”, pp. 38–133
- `EWR-025` (contextualizes) — *Everybody writes*, “Part I Writing Rules”, pp. 64–106

## [CP-001] Cut every element that does no work

**Statement.** Remove every element - word, sentence, paragraph or interface component - that does not add something the audience needs: functionless words, long words with short equivalents, inflated phrases, repetition, happy talk, decorative page furniture, and anything the audience already knows or can infer.

**Why.** Attention is the scarce resource. Element strength is inversely proportional to the noise around it; unread words and unused elements still make the artifact look daunting and bury what matters. Four of five corpus sources arrive at this rule independently, for prose, for interface copy and for whole screens.

**Apply when**
- revising any draft, page or screen
- an artifact feels padded, busy, official or important-sounding

**Do not apply when**
- removal would cost facts the audience needs to understand, decide or act
- the density IS the content (reference tables, data pages people came to scan)

**Rules**
- delete what loses nothing by its absence
- replace laborious phrases with their short equivalents
- start with the worst offenders: welcome blurbs, self-congratulation, filler that only makes a page look full

**Diagnostics**
- is every element doing new work?
- what exactly would the audience miss if this vanished?

**Transformations**
- inflated official phrasing → the plain fact it hides
- welcome/self-praise paragraph → deleted entirely, its one real fact moved into a heading

**Anti-patterns**
- throat-clearing frames; euphemism; fad vocabulary; happy talk; filling space because a sparse page looks empty

**Evaluation criteria**
- the revision is materially shorter/leaner with zero information loss

**Support.** 4 independent source(s) · confidence: high (Multi-source, operationally identical advice with independent rationales.)

**Provenance.**
- `OWW-003` (supports) — *On Writing Well*, “Part I: Principles”, pp. 11–17
- `OWW-007` (specializes) — *On Writing Well*, “Part I: Principles / Part II: Methods”, pp. 16–115
- `DMMT-019` (reinforces) — *Don't Make Me Think, Revisited*, “GUIDING PRINCIPLES”, pp. 60–61
- `DMMT-015` (specializes) — *Don't Make Me Think, Revisited*, “GUIDING PRINCIPLES”, pp. 49–148
- `EWR-012` (supports) — *Everybody writes*, “Part I Writing Rules”, pp. 71–77
- `EWR-013` (specializes) — *Everybody writes*, “Parts I and II”, pp. 72–172
- `CDE-036` (contextualizes) — *Content Design*, “Design”, pp. 202–203

## [CP-002] Test by removal - mark it, read without it, then delete

**Statement.** To find what to cut, presume every component guilty: mark suspects, re-experience the artifact without them, and delete whenever nothing is lost; when an element resists every rephrasing or restyling, try pure removal first. Expect early drafts to bear ~50% cuts without losing information or voice.

**Why.** A deletion is verified empirically, not argued: the without-it test converts editing from taste dispute into experiment. Zinsser's brackets, Krug's presumed-guilty stance for page elements and Handley's earn-its-place test are the same reversed burden of proof.

**Apply when**
- a draft or screen must shrink; an element keeps causing trouble

**Do not apply when**
- the artifact is already telegraphic and dropping needed facts

**Rules**
- mark suspects; keep only what fails the removal test
- after two failed rephrasings of a troublesome element, test deletion before a third attempt
- put the burden of proof on the element, never on the deletion

**Diagnostics**
- what exactly would the audience lose if this vanished?

**Transformations**
- stuck clause → deleted; sentence springs to life
- busy screen → each element challenged; survivors only

**Anti-patterns**
- rewording or restyling clutter instead of removing it

**Evaluation criteria**
- the cut version reads/works clean; nothing downstream misses the removed material

**Support.** 4 independent source(s) · confidence: high (Multi-source method with self-verifying application.)

**Provenance.**
- `OWW-006` (supports) — *On Writing Well*, “Part I: Principles”, pp. 16–18
- `OWW-030` (reinforces) — *On Writing Well*, “Part II: Methods”, pp. 46–47
- `DMMT-015` (reinforces) — *Don't Make Me Think, Revisited*, “GUIDING PRINCIPLES”, pp. 49–148
- `EWR-012` (supports) — *Everybody writes*, “Part I Writing Rules”, pp. 71–77
- `RUI-058` (specializes) — *Refactoring UI*, “Finishing Touches”, pp. 206–209

## [CP-016] Assume the audience knows nothing - explain in linear, need-ordered steps

**Statement.** When explaining anything unfamiliar, start from the one fact the audience must know first and widen step by step, each unit answering the question the previous one raised; never assume remembered knowledge, never skip the steps the expert no longer sees, explain every specialist term at first use, and translate stubborn abstractions with a fresh analogy built for this audience.

**Why.** Audiences cannot use what they must translate or backfill; sequential explanation also forces the writer to verify their own understanding. Familiar words are processed measurably faster (reading science), and explaining is not dumbing down - the standard objections have evidenced answers.

**Apply when**
- explaining a process, mechanism, product or finding to non-specialists

**Do not apply when**
- a defined expert audience shares the baseline - set that baseline consciously

**Rules**
- lead with the narrow unlocking fact; broaden toward significance and application
- after every unit ask: what does the audience need to know next?
- explain each specialist term at first use; build fresh contextual analogies rather than borrowing stock ones

**Diagnostics**
- can each unit be understood using only what earlier units established?

**Transformations**
- expert-ordered material → audience-need-ordered material
- meaningless big number → comparison to something this audience already knows

**Anti-patterns**
- 'simply' instructions hiding unstated steps; jargon defended as audience sophistication

**Evaluation criteria**
- a first-time reader restates the process correctly

**Support.** 3 independent source(s) · confidence: high (Three independent sources, one contributing empirical grounding.)

**Provenance.**
- `OWW-035` (supports) — *On Writing Well*, “Part III: Forms”, pp. 77–83
- `CDE-038` (specializes) — *Content Design*, “Preparation / Design”, pp. 65–206
- `CDE-006` (reinforces) — *Content Design*, “Preparation”, pp. 64–67
- `EWR-028` (reinforces) — *Everybody writes*, “Part I Writing Rules”, pp. 119–124

## [CP-017] Carry any subject on people and story

**Statement.** Make dry or complex subjects land by finding their human element - the person who loves or depends on the thing, your own experience as a handle, the customer cast as the hero - and by shaping information as narrative wherever a story genuinely exists, testing any commercial story for truth, humanity, originality and felt emotion before telling it.

**Why.** Audiences identify with people, not abstractions; narrative is the oldest attention technology. The marketing tradition operationalizes the same move: the customer as hero, the product as what enables them, the story tested against six elements with the business goals last.

**Apply when**
- an assignment looks lifeless; abstractions won't land; a product story is all product

**Do not apply when**
- inserting a person would fabricate; quick reference answers needing no story

**Rules**
- find the person with the fierce attachment and let them tell it
- cast the customer as hero: their problem, the urgency event, the enablement, the community that benefits
- test a commercial story in order: true, human, original, customer-centred, felt - goals last
- ask of any assignment: where is the story in this?

**Diagnostics**
- who in this story loves, fights or depends on the thing explained?
- is the teller the hero of this story, or is the audience?

**Transformations**
- institution chronicle → people story; product feature list → customer's before/after story

**Anti-patterns**
- bolting "color" onto facts; the company as hero of its own case study

**Evaluation criteria**
- every abstraction anchored to a person or picture; the piece retellable as a story whose hero is not the teller

**Support.** 2 independent source(s) · confidence: high (Two independent sources with concrete structures.)

**Provenance.**
- `OWW-036` (supports) — *On Writing Well*, “Part III: Forms”, pp. 57–88
- `OWW-021` (reinforces) — *On Writing Well*, “Part II: Methods / Part IV: Attitudes”, pp. 37–126
- `EWR-047` (specializes) — *Everybody writes*, “Part IV Story Rules”, pp. 232–240
- `EWR-045` (specializes) — *Everybody writes*, “Parts IV and VI”, pp. 217–378
- `EWR-063` (specializes) — *Everybody writes*, “Part VI 20 Things Marketers Write”, pp. 349–351

## [CP-025] Design every artifact for scanning - reading is the exception

**Statement.** Assume the audience will scan, not read: skim fragments in an F- or layered pattern, orient from headings and first lines, satisfice on the first plausible option, and start scrolling within seconds - so format everything (prose, pages, screens) as scannable structure: informative headings that tell the story alone, short paragraphs, lists, a few bolded key terms, and visible boundaries.

**Why.** Scanning is documented audience behavior in four of five sources - eye-tracking research (CDE), web use studies (DMMT), scroller reality (EWR) and the visual invitation of airy pages (OWW). Designing for the committed reader you imagine, instead of the scanner you have, is the corpus's most unanimous diagnosis of failure.

**Apply when**
- formatting or reviewing anything an audience will consume on screen

**Do not apply when**
- immersive long-form deliberately designed for committed reading (and even then, air helps)

**Rules**
- build a skeleton of front-loaded headings that tells a coherent story read alone
- short paragraphs, bulleted lists with a visible ordering principle, sparing bold on key terms
- break text with structure, not decoration; keep one thought per paragraph

**Diagnostics**
- reading only headings, labels and emphasized elements - does the structure and value still come through?
- where would a scanner's eye land first, and is that the right place?

**Transformations**
- wall of prose → skeleton of informative subheads + short chunks + one list

**Anti-patterns**
- clever/teasing headings that only work after reading; midget-paragraph confetti; walls of type

**Evaluation criteria**
- the headings-only read delivers the story; a scanner finds the answer without reading the prose

**Support.** 4 independent source(s) · confidence: high (Four independent sources, one empirical.)

**Provenance.**
- `CDE-005` (supports) — *Content Design*, “Preparation”, pp. 58–63
- `CDE-031` (specializes) — *Content Design*, “Design”, pp. 189–236
- `DMMT-008` (supports) — *Don't Make Me Think, Revisited*, “GUIDING PRINCIPLES”, pp. 32–40
- `DMMT-016` (specializes) — *Don't Make Me Think, Revisited*, “GUIDING PRINCIPLES”, pp. 50–202
- `EWR-032` (reinforces) — *Everybody writes*, “Parts I and VI”, pp. 64–303
- `EWR-030` (specializes) — *Everybody writes*, “Part I Writing Rules”, pp. 127–129
- `OWW-031` (reinforces) — *On Writing Well*, “Part II: Methods”, p. 47

## [CP-028] Keep sentences short enough for first-pass comprehension

**Statement.** Aim for sentences around fifteen to twenty words, treat the mid-twenties as the difficulty threshold, and split any sentence doing two dissimilar jobs - because comprehension falls sharply as sentence length rises, and the period is the cheapest clarity tool there is.

**Why.** Reading research (CDE) quantifies what the craft tradition prescribes: most writers don't reach the period soon enough. Short sentences also create the rhythm variation long-only prose lacks.

**Apply when**
- any line-editing pass; comprehension complaints; dense material for broad audiences

**Do not apply when**
- a deliberately long sentence under full control, for rhythm, by a writer who has earned it

**Rules**
- split sentences past ~25 words unless each clause serves one same job
- one thought per sentence as the default contract

**Diagnostics**
- can this sentence be said in one breath? does it do one job?

**Transformations**
- 40-word habitual sentence → two or three sentences, emphasis landing at each period

**Anti-patterns**
- uniform staccato (variation matters); comma-splicing to avoid the period

**Evaluation criteria**
- average length near the target band with deliberate variation; no sentence needs rereading

**Support.** 2 independent source(s) · confidence: high (Two sources, one quantitative.)

**Provenance.**
- `CDE-037` (supports) — *Content Design*, “Design”, pp. 203–204
- `OWW-026` (reinforces) — *On Writing Well*, “Part II: Methods”, pp. 43–45

## [CP-031] Leverage what the audience already knows - conventions and borrowed formats

**Statement.** Default to the established convention or a format the audience already knows - where things go, how they work, what they look like, what shape the content takes - and depart only when the replacement is either self-explanatory at zero learning cost or adds enough value to repay a small learning curve; when consistency and clarity collide, clarity wins if the gain is significant and the inconsistency slight.

**Why.** Conventions are pre-paid learning: they let people grasp things in a hurry. The same leverage powers Handley's borrowed formats (moving a resistant story into a shape the audience already loves). The visual-design tradition pushes back for expressive freedom - a real, bounded disagreement preserved below.

**Apply when**
- placing standard elements; choosing interaction patterns; a story resists attention in its native shape

**Do not apply when**
- you can show the replacement is self-explanatory or worth its learning curve - then innovate, ideally with a conventional fallback alongside

**Rules**
- before replacing a convention, state what work it was doing and whether the replacement clears Krug's two-part bar
- keep location-value elements (navigation, identity) rigidly consistent
- clarity trumps consistency - but only significant clarity against slight inconsistency, and never as a style alibi
- when a subject resists attention, move it into a familiar borrowed format rather than inventing a novel one

**Diagnostics**
- what convention is this replacing, and what was it doing?
- is the departure self-explanatory, or merely different?

**Transformations**
- custom scrollbar for prettiness → the system scrollbar
- dry subject in a dry format → the same story as a recipe / classified ad / game show the audience already knows

**Anti-patterns**
- innovation for awards; assuming the team's familiarity transfers to strangers; consistency invoked to end arguments without naming what the user loses

**Evaluation criteria**
- first-time users locate standard elements untold; every departure has a stated, tested benefit

**Tensions / disagreements**
- Protect-conventions (Krug) vs question-the-form (Wathan/Schoger): Krug optimizes stranger-usability, RUI optimizes distinctive interfaces. Both accept the other's boundary condition; the honest rule is posture-by-stakes - the more load-bearing the expectation, the higher the bar for departure.

**Support.** 2 independent source(s) · confidence: high (Two supporting sources plus a bounded, explicitly-conditioned dissent.)

**Provenance.**
- `DMMT-011` (supports) — *Don't Make Me Think, Revisited*, “GUIDING PRINCIPLES”, pp. 40–75
- `DMMT-012` (contextualizes) — *Don't Make Me Think, Revisited*, “GUIDING PRINCIPLES”, p. 44
- `EWR-048` (reinforces) — *Everybody writes*, “Part IV Story Rules”, pp. 241–244
- `RUI-059` (**contradicts**) — *Refactoring UI*: Refactoring UI urges questioning the conventional form of components (a dropdown is just a floating box; radios can be cards). Bounded: RUI itself excepts conventions carrying usability expectations and limits the move to important components - so the disagreement is about the default posture (protect vs question), not about breaking load-bearing conventions.

## [CP-032] Make interactive things unmistakably interactive

**Statement.** Give everything actionable a visible cue - shape, position or formatting - that says so at a glance; keep one consistent treatment for links; scale link emphasis to link importance; and never remove a signal-carrying visual distinction without replacing it with another.

**Why.** Affordances are the user's only map of what can be done; flat-design fashion and hover-dependent cues (absent on touch) quietly destroyed many of them. Emphasis economics apply: in link-dense UIs, uniform loud links say nothing.

**Apply when**
- styling anything clickable/tappable; adopting flat or minimal visual styles

**Rules**
- every actionable element carries an at-a-glance cue that survives without hover
- one consistent link treatment per surface; emphasis proportional to importance

**Diagnostics**
- squint test - can you tell what's clickable without touching anything?

**Transformations**
- flat text buttons indistinguishable from labels → visible affordance restored (shape, weight, color)

**Anti-patterns**
- hover-only affordances; de-styling links for aesthetics without replacement cues

**Evaluation criteria**
- first-time users identify every actionable element without trial taps

**Support.** 2 independent source(s) · confidence: high (Two independent sources.)

**Provenance.**
- `DMMT-006` (supports) — *Don't Make Me Think, Revisited*, “GUIDING PRINCIPLES”, pp. 26–153
- `RUI-034` (reinforces) — *Refactoring UI*, “Designing Text”, pp. 109–110

## [CP-043] Accessibility is a design constraint, not a compliance garnish

**Statement.** Build access in as a first-class constraint: meet contrast minimums (4.5:1 normal, 3:1 large text) by design moves that keep the design good (flip to dark-on-light, rotate hue) rather than by wrecking it; never let color be the only carrier of meaning; give every non-text element a genuine text alternative matched to intent; never classify disabled people as research outliers; and sequence the work - fix what confuses everyone, then the assistive-tech specifics.

**Why.** Three sources independently refuse the garnish model: visual design supplies craft-compatible techniques, content design the research ethics and alternatives discipline, usability the sequencing insight that guidelines applied to a confusing design fix nothing.

**Apply when**
- any visual or content decision; planning research; auditing products

**Rules**
- contrast minimums met creatively (invert, rotate hue) - not by abandoning the palette
- every meaning carried by color gets a second channel (icon, label, contrast)
- every non-text element: would someone who cannot see or load it still get the meaning? alt text matches intent
- access needs are patterns to serve, never exceptions to file

**Diagnostics**
- greyscale the design - what meaning disappears?

**Transformations**
- white text darkened-background hack → dark colored text on light colored background

**Anti-patterns**
- contrast fixed by ugliness (then reverted); decorative alt text; accessibility deferred to a final audit

**Evaluation criteria**
- contrast passes; greyscale test loses nothing; alt text conveys intent; research includes access needs by default

**Support.** 3 independent source(s) · confidence: high (Three independent sources.)

**Provenance.**
- `RUI-043` (supports) — *Refactoring UI*, “Working with Color”, pp. 142–145
- `RUI-044` (supports) — *Refactoring UI*, “Working with Color”, pp. 146–148
- `CDE-040` (reinforces) — *Content Design*, “Design”, pp. 209–211
- `CDE-026` (reinforces) — *Content Design*, “Preparation”, p. 164
- `DMMT-047` (contextualizes) — *Don't Make Me Think, Revisited*, “LARGER CONCERNS AND OUTSIDE INFLUENCES”, pp. 184–192

## [CP-047] Interface words are designed elements - eliminate, shrink, place

**Statement.** Treat every word in an interface as a designed element: first try to design instructions out of existence, cut what survives to the bare minimum and place it at the exact point of use; question every label (drop it when format or context already says it, fold it into the value when possible, emphasize whichever half users scan for); and where a thing must announce itself, do it in the expected spot with a clear, ownable six-to-eight-word statement.

**Why.** Interface copy is read while doing, not while reading: unplaced instructions go unread, redundant labels add noise, and clever announcements fail exactly where plain ones must work.

**Apply when**
- writing or reviewing any words inside a product

**Rules**
- instructions: design them away; survivors minimal, adjacent, unavoidable
- labels: delete when format/context identifies the value; else merge into the value phrase; emphasize the scanned-for half
- self-description: expected place, plain words, short enough to scan, specific enough that nobody else could use it

**Diagnostics**
- which of these words would be unnecessary if the design were better?

**Transformations**
- form intro paragraph → field-adjacent micro-hints only where hesitation occurs

**Anti-patterns**
- instructions relocated to manuals; label/value pairs where the value says it all

**Evaluation criteria**
- task completion without reading anything twice; every surviving word placed at its moment of use

**Support.** 2 independent source(s) · confidence: high (Two independent sources.)

**Provenance.**
- `DMMT-020` (supports) — *Don't Make Me Think, Revisited*, “GUIDING PRINCIPLES”, pp. 62–63
- `DMMT-030` (specializes) — *Don't Make Me Think, Revisited*, “THINGS YOU NEED TO GET RIGHT”, pp. 104–108
- `RUI-014` (specializes) — *Refactoring UI*, “Hierarchy is Everything”, pp. 41–43
- `RUI-015` (specializes) — *Refactoring UI*, “Hierarchy is Everything”, pp. 43–45

## [CP-037] Persuade without manipulating - and refuse when asked to

**Statement.** Use knowledge of how people read, decide and act to serve them; help influence and persuade openly; and refuse outright any request to deceive, to manufacture belief, to trick people, or to take what they did not agree to give - and on public causes, speak only where measurable action already backs the words.

**Why.** Expertise in attention and behavior is dual-use. The usability tradition draws the refusal line explicitly; the marketing tradition backs it commercially (audiences already suspect the motive; deception confirms it) and extends it to cause-washing.

**Apply when**
- any request to apply audience expertise against the audience's interest

**Rules**
- the line: open influence yes; deception, manufactured desirability, tricks and unconsented takings, no
- on social causes, publish only what internal action already substantiates - otherwise do the work first and say nothing yet

**Diagnostics**
- would this still work if the audience fully understood what we're doing?

**Transformations**
- dark-pattern brief → the honest version that survives daylight, or a documented refusal

**Anti-patterns**
- confirm-shaming, hidden costs, pre-ticked consent; values statements without action behind them

**Evaluation criteria**
- every persuasion mechanism survives full disclosure; cause statements map to named actions

**Support.** 2 independent source(s) · confidence: high (Two independent sources.)

**Provenance.**
- `DMMT-049` (supports) — *Don't Make Me Think, Revisited*, “LARGER CONCERNS AND OUTSIDE INFLUENCES”, pp. 199–200
- `EWR-054` (specializes) — *Everybody writes*, “Part V Publishing Rules”, pp. 266–268
- `EWR-049` (contextualizes) — *Everybody writes*, “Part V Publishing Rules”, pp. 245–247

## [CP-022] Earn attention every time - publish nothing that exists to fill a slot

**Statement.** Treat publishing as a privilege earned per piece: require genuine utility, grounding (data or real creativity) and empathy in everything released, decide deliberately what not to make or to let others provide, and never publish to hit a volume target, fill a calendar slot or satisfy an internal request.

**Why.** Every weak piece spends audience trust and buries the strong ones. Handley's triple test (utility × inspiration × empathy - all three or it fails) and content design's what-not-to-publish discipline are the same gate from two directions.

**Apply when**
- deciding whether a piece ships; planning content volume and cadence

**Rules**
- gate on all three: does it help the reader do something that matters, is it grounded, is it written from their point of view?
- maintain an explicit not-doing list - what you will not publish and what someone else already provides better

**Diagnostics**
- if this piece didn't exist, would the audience miss it - or would we?

**Transformations**
- calendar-slot filler → nothing (the slot dies, not the standard)

**Anti-patterns**
- volume targets as strategy; republishing what a better source already provides

**Evaluation criteria**
- each published piece passes the triple test on inspection; the not-doing list exists and is used

**Support.** 2 independent source(s) · confidence: high (Two independent sources with explicit tests.)

**Provenance.**
- `EWR-003` (supports) — *Everybody writes*, “Part I Writing Rules”, pp. 29–54
- `EWR-006` (reinforces) — *Everybody writes*, “Parts I and V”, pp. 53–250
- `CDE-029` (reinforces) — *Content Design*, “Design”, pp. 182–186

<!-- rendered by bookcompiler skill compiler v1.0.0 -->
