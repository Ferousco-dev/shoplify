---
name: lifestyle_prompt_generator
version: 1
kind: lifestyle_generator
model_hint: claude-sonnet-4-6
variables:
  - title
  - category
  - attributes
  - use_cases
  - how_it_works
  - how_to_use_steps
---

{
"task": "Generate exactly 3 lifestyle image prompts for the product. Each prompt describes a different usage scenario showing the product in a real home environment. All 3 must share identical style/lighting/palette — only the scene, activity, and body placement change.",

"product": {
"name": "{{ title }}",
"type": "{{ category }}",
"visual_description": "{{ attributes.product_visual_description or (title + ', ' + (attributes.material or '') + ', ' + (attributes.color or '')) }}",
"usage_rules": "{{ attributes.lifestyle_usage_rules or 'The product is used naturally as designed, visibly held or applied as the primary user would.' }}",
"use_cases": {{ use_cases | tojson }},
"how_it_works": "{{ how_it_works }}",
"how_to_use_steps": {{ how_to_use_steps | tojson }}
},

"style_base": {
"name": "Soft Hours at Home",
"locked": true,
"rules": [
"Warm cosy home interior — couch, bed, armchair, or floor setting",
"Soft natural light — afternoon window light or warm lamp glow",
"Colour palette: cream (#FCF6E8), warm sand, sage green, warm white, muted natural tones. No bright whites, no neons.",
"Mood: calm, present, resting. Not clinical, not performative, not in distress.",
"People: diverse body types, ages, skin tones. No forced smiles. Peaceful expression.",
"Setting: real home feel — linen, wood, plants, mugs. Slightly imperfect, not magazine-styled.",
"Shallow depth of field — person and product both legible, background softly blurred.",
"No text, no watermarks, no overlays."
],
"product_accuracy_rules": [
"CRITICAL: Apply the usage_rules exactly. Do not let the product appear incorrectly applied.",
"Any cables, wires, or connectors must be visibly attached and physically running between components.",
"The device or product unit must be visible in frame — resting on a surface, held in hand, or attached to body as designed.",
"Match the product visual_description — do not alter shape, colour, branding, or proportions."
]
},

"output_format": {
"type": "json_only",
"structure": {
"shot_1": {
"use_case": "string",
"scene_summary": "string — one sentence",
"gemini_prompt": "string — 80 to 120 words, ready to paste into Gemini"
},
"shot_2": {
"use_case": "string",
"scene_summary": "string",
"gemini_prompt": "string"
},
"shot_3": {
"use_case": "string",
"scene_summary": "string",
"gemini_prompt": "string"
}
},
"rules": [
"Each gemini_prompt must open with the scene and person, then describe product usage in explicit physical detail referencing usage_rules, then style and lighting.",
"All 3 prompts must feel visually consistent — same lighting quality, same palette, same mood.",
"Vary the setting and body placement across the 3 shots — do not repeat the same room or position.",
"Weave usage_rules into the prompt naturally — the product accuracy detail should read as description, not instruction."
]
}
}
