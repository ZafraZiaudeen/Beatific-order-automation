export const FIXED_PERSONALIZATION_FIELDS = [
  {
    key: 'front_cover_name',
    label: 'Cover Name',
    target: 'cover',
    prompt: 'Cover Name: Add a name to the cover:',
    sampleValue: 'Stephanie',
  },
  {
    key: 'spine_text',
    label: 'Spine Text',
    target: 'cover',
    prompt: 'Spine Text: Add text for the book spine:',
    sampleValue: 'I love you always',
    defaultRotation: 90,
  },
  {
    key: 'back_cover_text',
    label: 'Back Text',
    target: 'cover',
    prompt: 'Back Text: Add text for the back cover of the book:',
    sampleValue: 'Made with love',
  },
  {
    key: 'quote',
    label: 'Inside Page Quote',
    target: 'interiorFirstPage',
    prompt: 'quote: add a quote to the inside page:',
    sampleValue: 'Bloom where you are planted',
  },
  {
    key: 'inside_page_name',
    label: 'Inside Page Name',
    target: 'interiorFirstPage',
    prompt: 'name for inside page : add a name for inside page',
    sampleValue: 'Stephanie',
  },
  {
    key: 'valediction_text',
    label: 'Inside Page Valediction',
    target: 'interiorFirstPage',
    prompt: 'valedicatation for inside page: add a valediction text',
    sampleValue: 'With love,',
  },
]

export const getFixedPersonalizationField = (key) =>
  FIXED_PERSONALIZATION_FIELDS.find((field) => field.key === key) || null
