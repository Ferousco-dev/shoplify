---
name: lifestyle_generator
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
  "task": "Generate exactly 3 lifestyle image prompts for the product below. Each one is a different shot type — keep style/lighting/palette identical across all three; only the scene framing and body placement change.",

  "shot_types": {
    "scale_correct": "A clear lifestyle composition showing the product in a real home environment, framed so the viewer can SEE the product's actual size — placed alongside familiar objects (mug, hand, book, blanket fold) or held by a person where their body gives natural scale. Camera at chest or eye level, medium-wide lens. Person is calm, present, resting. Product clearly identifiable.",
    "human_perspective": "First-person POV / over-the-shoulder shot — like a real spoonie photographing the product from their own perspective on a low-energy day. Hand or arm in frame, close-ish to the product. Slightly imperfect framing, intimate. Phone-camera-ish softness, not polished DSLR.",
    "ambient": "Atmospheric lifestyle shot with NO person in frame. Product placed naturally in its real environment — couch, bedside table, kitchen counter, bath ledge. Surrounding props (linen, mug, plants, soft blanket) create mood. Implies someone just stepped away. Soft window light, slight bokeh."
  },


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
      "CRITICAL: Apply the usage_rules exactly. Do not let the product appear incorrectly applied, disconnected, or positioned over clothing when it should be on skin.",
      "Any cables, wires, or connectors must be visibly attached and physically running between components.",
      "The device or product unit must be visible in frame — resting on a surface, held in hand, or attached to body as designed.",
      "Match the product visual_description — do not alter shape, colour, branding, or proportions."
    ]
  },

  "output_format": {
    "type": "json_only",
    "structure": {
      "scale_correct": {"use_case": "string", "scene_summary": "string — one sentence", "gemini_prompt": "string — 80 to 120 words ready for Gemini, follows the scale_correct shot_type rules"},
      "human_perspective": {"use_case": "string", "scene_summary": "string", "gemini_prompt": "string — 80 to 120 words, follows the human_perspective rules"},
      "ambient": {"use_case": "string", "scene_summary": "string", "gemini_prompt": "string — 80 to 120 words, follows the ambient rules"}
    },
    "rules": [
      "Each gemini_prompt must open with the scene framing required by its shot_type, then describe product usage in explicit physical detail referencing usage_rules, then style and lighting.",
      "All 3 prompts must feel visually consistent — same lighting quality, same palette, same mood from the style_base.",
      "Vary the setting and body placement across the 3 shots — do not repeat the same room or position.",
      "Weave usage_rules into the prompt naturally — the product accuracy detail should read as description, not instruction.",
      "Pull the use_case from the use_cases array; assign different ones to each shot."
    ]
  }
}
