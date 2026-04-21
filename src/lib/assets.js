import api from './api'

export const MAX_ASSET_FILE_SIZE = 50 * 1024 * 1024

export const buildAssetThumbnailUrl = (url, width = 400) => {
  if (!url) return ''
  if (!url.includes('cloudinary.com')) return url
  return url.replace('/upload/', `/upload/q_auto,w_${width},f_webp/`)
}

// Converts Google Drive share links to direct-download URLs that Lulu (and browsers) can fetch.
// drive.google.com/file/d/{id}/view  →  drive.google.com/uc?export=download&id={id}
export const normalizeAssetUrl = (value = '') => {
  const trimmed = value.trim()
  const gdMatch = trimmed.match(/drive\.google\.com\/file\/d\/([^/?\s]+)/)
  if (gdMatch) return `https://drive.google.com/uc?export=download&id=${gdMatch[1]}`
  return trimmed
}

export const isValidHttpUrl = (value = '') => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export const validateAssetFile = (
  file,
  {
    allowImages = false,
    allowPdf = false,
    maxSize = MAX_ASSET_FILE_SIZE,
  } = {}
) => {
  if (!file) return 'Choose a file to upload'

  const isPdf = file.type === 'application/pdf'
  const isImage = file.type.startsWith('image/')

  if (!((allowPdf && isPdf) || (allowImages && isImage))) {
    if (allowImages && allowPdf) return 'Upload a PDF or image file'
    if (allowImages) return 'Upload an image file'
    return 'Upload a PDF file'
  }

  if (file.size > maxSize) {
    return 'File too large (max 50MB)'
  }

  return ''
}

export const uploadAssetFile = async ({ file, folder, onProgress }) => {
  const { data: presign } = await api.post('/upload/presign', { folder })

  if (!presign.configured) {
    return URL.createObjectURL(file)
  }

  const formData = new FormData()
  formData.append('file', file)
  Object.entries(presign.fields || {}).forEach(([key, value]) => {
    formData.append(key, value)
  })

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100))
      }
    }

    xhr.open('POST', presign.url)
    xhr.onload = () => {
      if (xhr.status !== 200 && xhr.status !== 201) {
        reject(new Error('Upload failed'))
        return
      }

      try {
        const response = JSON.parse(xhr.responseText || '{}')
        const uploadedUrl = response.secure_url || response.url
        if (!uploadedUrl) {
          reject(new Error('Upload did not return a file URL'))
          return
        }
        resolve(uploadedUrl)
      } catch {
        reject(new Error('Upload failed'))
      }
    }
    xhr.onerror = () => reject(new Error('Upload failed'))
    xhr.send(formData)
  })
}
