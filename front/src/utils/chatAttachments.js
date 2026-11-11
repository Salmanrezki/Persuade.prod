export const MAX_ATTACHMENT_BYTES = 600 * 1024
const types = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  csv: 'text/csv',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}
export const ATTACHMENT_ACCEPT = Object.keys(types)
  .map((ext) => `.${ext}`)
  .join(',')
export async function readChatAttachment(file) {
  const mime = types[file.name.split('.').pop().toLowerCase()]
  if (!mime)
    throw new Error(
      'Choisissez un PDF, document Office, texte ou une image JPG, PNG ou WebP.',
    )
  if (!file.size || file.size > MAX_ATTACHMENT_BYTES)
    throw new Error(
      'Le fichier doit contenir entre 1 octet et 600 Ko. Pour un document plus grand, partagez un lien.',
    )
  if (file.name.length > 180)
    throw new Error('Le nom du fichier est trop long (180 caractères maximum).')
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Impossible de lire ce fichier.'))
    reader.onabort = () => reject(new Error('Lecture du fichier interrompue.'))
    reader.readAsDataURL(file)
  })
  return {
    name: file.name,
    size: file.size,
    mime,
    dataUrl: `data:${mime};base64,${String(dataUrl).split(',')[1]}`,
  }
}
export function downloadChatAttachment(attachment) {
  const mime = attachment?.mime
  if (
    !Object.values(types).includes(mime) ||
    typeof attachment.dataUrl !== 'string' ||
    !attachment.dataUrl.startsWith(`data:${mime};base64,`)
  )
    throw new Error('Ce document ne peut pas être téléchargé ici.')
  const encoded = attachment.dataUrl.split(',')[1]
  if (encoded.length > Math.ceil(MAX_ATTACHMENT_BYTES / 3) * 4)
    throw new Error('Document trop volumineux.')
  const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0))
  const url = URL.createObjectURL(
    new Blob([bytes], { type: 'application/octet-stream' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = (attachment.name || 'document').replace(
    /[\\/\u0000-\u001f]/g,
    '_',
  )
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
