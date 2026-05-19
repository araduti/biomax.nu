# Marketing Skills as GitHub Copilot Chat Modes

This directory contains **40 marketing skills installed as GitHub Copilot custom chat modes**, pinned to the **Claude Opus 4.7** model.

- **Source:** [`coreyhaines31/marketingskills`](https://github.com/coreyhaines31/marketingskills) (Agent Skills format, v2.0)
- **Target format:** GitHub Copilot custom chat modes — one `<name>.chatmode.md` per skill, plus a sibling `<name>/` folder holding the skill's `references/` and `evals/` assets.
- **Model:** `Claude Opus 4.7` (set in the frontmatter of every chat mode).

## How to use them in Copilot Chat

1. Open Copilot Chat in VS Code, JetBrains, Visual Studio, or github.com.
2. Open the chat-mode picker (next to the model picker) and select one of the 40 modes — for example `cro`, `seo-audit`, `copywriting`.
3. Type your request. The mode loads the full skill body and runs against the selected model.

You can also reference a mode inside another conversation, e.g. _"act as the `/seo-audit` chat mode and review `/produkter/[slug]`"_.

## Product marketing context (shared by all skills)

Every skill checks for a product marketing context file before asking questions. The canonical location in this repo is:

```
.github/product-marketing.md
```

with fallback to `.agents/product-marketing.md`, `.claude/product-marketing.md`, or the legacy `product-marketing-context.md`. To (re)generate it, run the `product-marketing` chat mode.

## Installed skills

| Mode | Description |
|------|-------------|
| `/ab-testing` | When the user wants to plan, design, or implement an A/B test or experiment, or build a growth experimentation program. Also use when the us… |
| `/ad-creative` | When the user wants to generate, iterate, or scale ad creative — headlines, descriptions, primary text, or full ad variations — for any paid… |
| `/ads` | When the user wants help with paid advertising campaigns on Google Ads, Meta (Facebook/Instagram), LinkedIn, Twitter/X, or other ad platform… |
| `/ai-seo` | When the user wants to optimize content for AI search engines, get cited by LLMs, or appear in AI-generated answers. Also use when the user … |
| `/analytics` | When the user wants to set up, improve, or audit analytics tracking and measurement. Also use when the user mentions "set up tracking," "GA4… |
| `/aso` | When the user wants to audit or optimize an App Store or Google Play listing. Also use when the user mentions 'ASO audit,' 'app store optimi… |
| `/churn-prevention` | When the user wants to reduce churn, build cancellation flows, set up save offers, recover failed payments, or implement retention strategie… |
| `/co-marketing` | When the user wants to find co-marketing partners, plan joint campaigns, or brainstorm partnership opportunities. Use when the user says 'co… |
| `/cold-email` | Write B2B cold emails and follow-up sequences that get replies. Use when the user wants to write cold outreach emails, prospecting emails, c… |
| `/community-marketing` | Build and leverage online communities to drive product growth and brand loyalty. Use when the user wants to create a community strategy, gro… |
| `/competitor-profiling` | When the user wants to research, profile, or analyze competitors from their URLs. Also use when the user mentions 'competitor profile,' 'com… |
| `/competitors` | When the user wants to create competitor comparison or alternative pages for SEO and sales enablement. Also use when the user mentions 'alte… |
| `/content-strategy` | When the user wants to plan a content strategy, decide what content to create, or figure out what topics to cover. Also use when the user me… |
| `/copy-editing` | When the user wants to edit, review, or improve existing marketing copy, or refresh outdated content. Also use when the user mentions 'edit … |
| `/copywriting` | When the user wants to write, rewrite, or improve marketing copy for any page — including homepage, landing pages, pricing pages, feature pa… |
| `/cro` | When the user wants to optimize, improve, or increase conversions on any marketing page or form — including homepage, landing pages, pricing… |
| `/customer-research` | When the user wants to conduct, analyze, or synthesize customer research. Use when the user mentions "customer research," "ICP research," "t… |
| `/directory-submissions` | When the user wants to submit their product to startup, SaaS, AI, agent, MCP, no-code, or review directories for backlinks, domain rating, a… |
| `/emails` | When the user wants to create or optimize an email sequence, drip campaign, automated email flow, or lifecycle email program. Also use when … |
| `/free-tools` | When the user wants to plan, evaluate, or build a free tool for marketing purposes — lead generation, SEO value, or brand awareness. Also us… |
| `/image` | When the user wants to create, generate, edit, or optimize images for marketing — blog heroes, social graphics, product mockups, profile ban… |
| `/launch` | When the user wants to plan a product launch, feature announcement, or release strategy. Also use when the user mentions 'launch,' 'Product … |
| `/lead-magnets` | When the user wants to create, plan, or optimize a lead magnet for email capture or lead generation. Also use when the user mentions "lead m… |
| `/marketing-ideas` | When the user needs marketing ideas, inspiration, or strategies for their SaaS or software product. Also use when the user asks for 'marketi… |
| `/marketing-psychology` | When the user wants to apply psychological principles, mental models, or behavioral science to marketing. Also use when the user mentions 'p… |
| `/onboarding` | When the user wants to optimize post-signup onboarding, user activation, first-run experience, or time-to-value. Also use when the user ment… |
| `/paywalls` | When the user wants to create or optimize in-app paywalls, upgrade screens, upsell modals, or feature gates. Also use when the user mentions… |
| `/popups` | When the user wants to create or optimize popups, modals, overlays, slide-ins, or banners for conversion purposes. Also use when the user me… |
| `/pricing` | When the user wants help with pricing decisions, packaging, or monetization strategy. Also use when the user mentions 'pricing,' 'pricing ti… |
| `/product-marketing` | When the user wants to create or update their product marketing context document. Also use when the user mentions 'product context,' 'market… |
| `/programmatic-seo` | When the user wants to create SEO-driven pages at scale using templates and data. Also use when the user mentions "programmatic SEO," "templ… |
| `/referrals` | When the user wants to create, optimize, or analyze a referral program, affiliate program, or word-of-mouth strategy. Also use when the user… |
| `/revops` | When the user wants help with revenue operations, lead lifecycle management, or marketing-to-sales handoff processes. Also use when the user… |
| `/sales-enablement` | When the user wants to create sales collateral, pitch decks, one-pagers, objection handling docs, or demo scripts. Also use when the user me… |
| `/schema` | When the user wants to add, fix, or optimize schema markup and structured data on their site. Also use when the user mentions "schema markup… |
| `/seo-audit` | When the user wants to audit, review, or diagnose SEO issues on their site. Also use when the user mentions "SEO audit," "technical SEO," "w… |
| `/signup` | When the user wants to optimize signup, registration, account creation, or trial activation flows. Also use when the user mentions "signup c… |
| `/site-architecture` | When the user wants to plan, map, or restructure their website's page hierarchy, navigation, URL structure, or internal linking. Also use wh… |
| `/social` | When the user wants help creating, scheduling, or optimizing social media content for LinkedIn, Twitter/X, Instagram, TikTok, Facebook, or o… |
| `/video` | When the user wants to create, generate, or produce video content using AI tools or programmatic frameworks. Also use when the user mentions… |

## Layout

```
.github/
  chatmodes/
    README.md                        # this file
    <skill>.chatmode.md              # Copilot chat mode (frontmatter + skill body)
    <skill>/
      references/...                 # supporting reference files cited by the skill
      evals/...                      # the skill's evaluation prompts
  product-marketing.md               # shared product context, read by every skill first
```

## Updating

When upstream releases a new version, re-run the conversion against `coreyhaines31/marketingskills` `main`. The conversion only changes:

1. Frontmatter — re-formatted to Copilot's `description` + `model: Claude Opus 4.7` shape.
2. Internal links — `references/...` and `evals/...` are rewritten to `<skill>/references/...` and `<skill>/evals/...` so they resolve from `.github/chatmodes/`.
3. Product-marketing context lookup — `.github/product-marketing.md` added as the primary path with the original `.agents/`/`.claude/` paths kept as fallbacks.

Everything else is the skill content verbatim from upstream.

## License

The marketing skills are upstream MIT-licensed by Corey Haines. See the original repo for the full license text.
