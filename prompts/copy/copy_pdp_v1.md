---
name: copy_pdp
version: 1
kind: copy_pdp
model_hint: claude-sonnet-4-6
variables:
  - title
  - category
  - attributes
  - description
  - apify_1688
  - apify_amazon
---
{
  "brand": {
    "name": "Alivio",
    "tagline": "By/For/With Spoonies",
    "voice": {
      "tone": ["validation-first", "warm", "witty", "spoonie-centric", "direct, conversational, authentic", "gentle strength", "anti-ableist, inclusive", "no toxic positivity"],
      "style_rules": ["Short punchy sentences. Hook-first.", "Avoid em dashes.", "Use 'you' language. Permission-giving.", "1-2 spoonie-isms in short copy, 2-3 in long copy.", "Simple words, short paragraphs, scannable bullets.", "No medical promises."],
      "banned_words": ["cure", "heal", "guarantee", "miracle"],
      "banned_phrases": ["just push through", "everyone has the same 24 hours", "it's all in your head"]
    }
  },
  "task": {
    "type": "shopify_pdp_copy",
    "objective": "High-converting PDP copy set for Minimog Sleek theme, mapped to Shopify metafields (namespace: alivio).",
    "source_of_truth": "Use apify_1688 and apify_amazon as primary source. Cross-reference — prefer the more specific value. Missing data: write safe generic copy, mark inferred:true in field_notes.",
    "reading_level": "5th_grade",
    "audience": "Spoonies (chronically ill people) and spoonie allies"
  },
  "inputs": {
    "product_name": "{{ title }}",
    "product_type": "{{ category }}",
    "primary_keyword": "{{ attributes.primary_keyword or '' }}",
    "secondary_keywords": "{{ attributes.secondary_keywords or '' }}",
    "pairs_well_with": "{{ attributes.pairs_well_with or '' }}",
    "founder_personas": {
      "_note": "Use these personas to write alivio.founder_fave. Generate contextual quotes grounded in this specific product — not generic wellness copy.",
      "amanda": {
        "role": "Co-founder. Lives with chronic illness. Speaks from personal pain experience.",
        "voice": "Warm, emotionally honest, body-aware. Talks about what her body actually needs. References bad days, flares, and what helps her get through.",
        "angle": "What does she reach for this product on her worst days? What does it do for her specific pain or symptoms? How does it make her feel supported?"
      },
      "michelle": {
        "role": "Co-founder. Practical, systems-thinking, real-life focused.",
        "voice": "Direct, no-fuss, convenience-oriented. Talks about where she keeps things, how they fit into her routine, what makes them easy to use on low-energy days.",
        "angle": "Where does she keep this product? How does it fit into her day? What makes it practical and worth having? Portable and accessible angles."
      }
    },
    "apify_1688": {{ apify_1688 | tojson }},
    "apify_amazon": {{ apify_amazon | tojson }}
  },
  "approve_workflow": {
    "internal_steps": [{"name": "4c_self_check", "instruction": "Silently run internal 4C check (Clarity, Confidence, Cost, Community) and apply improvements before output. Do not output the scoring."}]
  },
  "output": {
    "format": "json_only",
    "instruction": "Return ONLY valid JSON. No markdown fences. No commentary before or after.",
    "metafields": {
      "alivio.seo_title": "string <=60 chars, keyword-first",
      "alivio.seo_description": "string <=155 chars",
      "alivio.hero_hook": "string — 1 punchy sentence, spoonie voice",
      "alivio.hero_description": "string — 2-3 sentences max",
      "alivio.what_it_is": "string — one plain sentence",
      "alivio.whats_included": "array[string]",
      "alivio.spoonie_approved": {"badge": "string", "reason": "string"},
      "alivio.what_spoonies_love": "array[string] — 4 items, format: 'Label - one sentence why'",
      "alivio.top_benefits": "array[string] — 4 items",
      "alivio.worth_it_because": "array[string] — 3 items",
      "alivio.why_this_helps": "string — exactly 2 short paragraphs",
      "alivio.how_it_works": "array[string] — exactly 2 lines",
      "alivio.how_to_use": {"steps": "array[string] — exactly 4 steps", "spoonie_tip": "string"},
      "alivio.use_cases": "array[string] — exactly 5 items, format: 'Label - one sentence context'",
      "alivio.in_the_box": "array[string]",
      "alivio.specs_table": "array[{label:string, value:string}]",
      "alivio.safety_note": "string — safety only, include warnings from 1688 data",
      "alivio.founder_fave": {
        "amanda": "string — 1-2 sentences in Amanda's voice (warm, emotional, pain-experience focused). Write as if Amanda is sharing a personal moment with the product — what she reaches for it on bad days for, what it does for her body specifically. Grounded in the product's actual use case. Not generic wellness copy.",
        "michelle": "string — 1-2 sentences in Michelle's voice (practical, real-life focused, portable/convenience angle). Write as if Michelle is recommending it to a friend — where she keeps it, how it fits into her routine, what makes it easy to use. Specific to this product. Not generic."
      },
      "alivio.faq": "array[{question:string, answer:string}] — exactly 10 items",
      "alivio.pairs_well_with": "array[string]",
      "alivio.tools_and_support": "array[string]",
      "alivio.loyalty": "array[string] — 2-3 lines, Spoonie Society, generic approved phrasing",
      "alivio.impact": "array[string] — 2-3 lines, $1 per order Impact Fund, generic approved phrasing",
      "alivio.image_alt_text": "array[string] — one alt text per product image, min 5",
      "field_notes": "object — key per metafield, value: {inferred: boolean, note: string}"
    }
  }
}
