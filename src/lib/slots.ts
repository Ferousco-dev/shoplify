/**
 * Maps the 14 CSV image-output columns to the prompt file used to generate them.
 *
 * The CSV columns are pre-defined by Alivio's PDP layout. Each slot has a role,
 * a label that becomes the human-friendly name in the UI, and a prompt path
 * relative to ../prompts.
 */

export type ImageSlot = {
  key: string; // CSV column header (kept as in the source file)
  shortKey: string; // short id used in API + state
  label: string; // human label for UI
  promptPath: string; // relative path inside ../prompts/
  altPattern: string; // alt-text template — {{title}} interpolated client-side
};

export const IMAGE_SLOTS: ImageSlot[] = [
  {
    key: "Front Hero_Image",
    shortKey: "front",
    label: "Front Hero",
    promptPath: "ecommerce/image_ecommerce_front_v1.md",
    altPattern: "{{title}} — front view",
  },
  {
    key: "Three-Quarter_Image",
    shortKey: "three_quarter",
    label: "Three-Quarter",
    promptPath: "ecommerce/image_ecommerce_45_v1.md",
    altPattern: "{{title}} — three-quarter view",
  },
  {
    key: "Profile_view_Image",
    shortKey: "profile",
    label: "Profile View",
    promptPath: "ecommerce/image_ecommerce_side_v1.md",
    altPattern: "{{title}} — profile view",
  },
  {
    key: "Birds_Eye_Image",
    shortKey: "birds_eye",
    label: "Birds Eye",
    promptPath: "ecommerce/image_ecommerce_birds_eye_v1.md",
    altPattern: "{{title}} — birds-eye view",
  },
  {
    key: "Hero_Flatlay_Image",
    shortKey: "flatlay",
    label: "Hero Flatlay",
    promptPath: "ecommerce/image_ecommerce_flatlay_v1.md",
    altPattern: "{{title}} — full kit, overhead view",
  },
  {
    key: "Scale-Correct_Lifestyle_Image_url",
    shortKey: "scale_correct",
    label: "Scale-Correct Lifestyle",
    promptPath: "lifestyle/image_lifestyle_scale_correct_v1.md",
    altPattern: "{{title}} — lifestyle, scale-correct",
  },
  {
    key: "Human_Perspective_Image",
    shortKey: "human_perspective",
    label: "Human Perspective",
    promptPath: "lifestyle/image_lifestyle_human_perspective_v1.md",
    altPattern: "{{title}} — human perspective",
  },
  {
    key: "Ambient_Lifestyle_Image",
    shortKey: "ambient",
    label: "Ambient Lifestyle",
    promptPath: "lifestyle/image_lifestyle_ambient_v1.md",
    altPattern: "{{title}} — ambient lifestyle",
  },
  {
    key: "Rear_Base_Image",
    shortKey: "rear",
    label: "Rear / Base",
    promptPath: "ecommerce/image_ecommerce_back_v1.md",
    altPattern: "{{title}} — rear / base",
  },
  {
    key: "Texture_Detail_Image",
    shortKey: "texture",
    label: "Texture Detail",
    promptPath: "closeup/image_closeup_texture_v1.md",
    altPattern: "{{title}} — texture detail",
  },
  {
    key: "Functional_Detail_Image",
    shortKey: "functional",
    label: "Functional Detail",
    promptPath: "closeup/image_closeup_functional_v1.md",
    altPattern: "{{title}} — functional detail",
  },
  {
    key: "Branding_Detail_Image",
    shortKey: "branding",
    label: "Branding Detail",
    promptPath: "closeup/image_closeup_branding_v1.md",
    altPattern: "{{title}} — branding detail",
  },
  {
    key: "UGC_In_Routine_Image",
    shortKey: "ugc_routine",
    label: "UGC In Routine",
    promptPath: "ugc/image_ugc_in_routine_v1.md",
    altPattern: "{{title}} — customer everyday moment",
  },
  {
    key: "UGC_In_Use_Image",
    shortKey: "ugc_use",
    label: "UGC In Use",
    promptPath: "ugc/image_ugc_in_use_v1.md",
    altPattern: "{{title}} — customer using product",
  },
];

export function slotByShortKey(short: string): ImageSlot | undefined {
  return IMAGE_SLOTS.find((s) => s.shortKey === short);
}
