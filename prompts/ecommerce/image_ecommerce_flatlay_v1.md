---
name: image_ecommerce_flatlay
version: 1
kind: image_ecommerce
model_hint: gemini-2.5-flash-image
variables:
  - title
  - attributes
  - slot
---

{{ title }} complete kit overhead flat lay, shot directly from above at 90 degrees. All included components arranged neatly on a cream (#FCF6E8) surface: {{ attributes.whats_included_list or 'all included components' }}. {{ attributes.product_visual_description or (title + ', ' + (attributes.material or 'product') + ', ' + (attributes.color or 'as shown')) }}.

Clean editorial arrangement — balanced, components spread with breathing room, nothing overlapping. Soft even overhead studio lighting, no harsh shadows, no reflections. Square or landscape orientation. High resolution, no watermark, no text overlay.

Match all components exactly to reference images — do not alter any component's shape, colour, or branding.
