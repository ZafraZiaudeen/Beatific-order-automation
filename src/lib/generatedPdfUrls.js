export const isGeneratedPdfUrl = (value = '') =>
  /(?:^|[/\\])generated-pdfs(?:[/\\]|$)/i.test(String(value || '')) ||
  /(?:^|\/)(?:api\/)?orders\/download\/[^/?#]+\.pdf(?:[?#].*)?$/i.test(String(value || ''))
