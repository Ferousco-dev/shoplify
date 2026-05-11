---
name: image_closeup_branding
version: 1
kind: image_closeup
model_hint: gemini-2.5-flash-image
variables:
  - title
  - attributes
  - slot
---
{{ title }}, extreme close-up macro shot. Focus area: {{ attributes.micro_focus_branding or attributes.micro_focus_3 or 'the brand label, logo, model name, or care tag and the surrounding material edge — show stitching, embossing, or print clarity around the brand mark' }}.

The focus area is sharp and fills most of the frame. Cream background (#FCF6E8) softly blurred behind. Shallow depth of field, crisp focus on the specified detail. Soft natural studio lighting — no reflections, no glare. Lighting and colour match the main ecommerce shots exactly. High resolution, no watermark.

Use all attached ecommerce angle images as reference — do not alter shape, colour, branding, or proportions.
