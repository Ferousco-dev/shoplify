---
name: image_ecommerce_birds_eye
version: 1
kind: image_ecommerce
model_hint: gemini-2.5-flash-image
variables:
  - title
  - attributes
  - slot
---
{{ title }}, {{ attributes.product_visual_description or (title + ', ' + (attributes.material or 'product') + ', ' + (attributes.color or 'as shown')) }}.

Top-down birds-eye view shot directly from above at 90 degrees, product laid flat and fully visible. Square or landscape orientation, product centred in frame, consistent margins, cream background (#FCF6E8), soft natural shadow at base, soft even overhead studio lighting with no harsh reflections, high resolution, no watermark, no cropping.

Match the product exactly as shown in the reference image — do not alter shape, colour, branding, or proportions. Product only, no hands, no person.
