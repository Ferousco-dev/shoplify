---
name: image_ecommerce_45
version: 1
kind: image_ecommerce
model_hint: gemini-2.5-flash-image-preview
variables:
  - title
  - attributes
  - slot
---
{{ title }}, {{ attributes.product_visual_description or (title + ', ' + (attributes.material or 'product') + ', ' + (attributes.color or 'as shown')) }}.

Three-quarter view from the front-right at a 45-degree angle, showing both the front face and right side of the product simultaneously. Portrait orientation, product centred in frame, consistent margins, cream background (#FCF6E8), soft natural shadow at base, soft studio lighting with gentle shadows showing dimensionality, high resolution, no watermark, no cropping.

Match the product exactly as shown in the reference image — do not alter shape, colour, branding, or proportions. Product only, no hands, no person.
