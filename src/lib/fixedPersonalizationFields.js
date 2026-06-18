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
    key: 'first_page_message',
    label: 'First Page Message',
    target: 'interiorFirstPage',
    prompt: 'First Page Message: Add a special message:',
    sampleValue: 'Write something meaningful here',
  },
]

export const getFixedPersonalizationField = (key) =>
  FIXED_PERSONALIZATION_FIELDS.find((field) => field.key === key) || null
