---
name: image_ecommerce_back
version: 1
kind: image_ecommerce
model_hint: gemini-2.5-flash-image-preview
variables:
  - title
  - attributes
  - slot
---
{{ title }}, {{ attributes.product_visual_description or (title + ', ' + (attributes.material or 'product') + ', ' + (attributes.color or 'as shown')) }}.

Back view showing rear panel and any back details such as clips, battery compartments, labels, or vents. Portrait orientation, product centred in frame, consistent margins, cream background (#FCF6E8), soft natural shadow at base, soft even studio lighting, high resolution, no watermark, no cropping.

Match the product exactly as shown in the reference image — do not alter shape, colour, branding, or proportions. Product only, no hands, no person.
