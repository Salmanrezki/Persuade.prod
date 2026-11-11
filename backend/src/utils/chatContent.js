export const MAX_ATTACHMENT_BYTES = 600 * 1024
const allowedTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/webp',
])
export function normalizeChatContent(body = {}) {
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (text.length > 5000)
    throw new Error('Le message est limité à 5 000 caractères.')
  let attachment = null
  if (body.attachment != null) {
    const a = body.attachment
    if (
      typeof a.name !== 'string' ||
      !a.name.trim() ||
      a.name.length > 180 ||
      !allowedTypes.has(a.mime) ||
      typeof a.dataUrl !== 'string'
    ) {
      throw new Error('Format de pièce jointe non pris en charge.')
    }
    const prefix = `data:${a.mime};base64,`
    if (!a.dataUrl.startsWith(prefix)) throw new Error('Pièce jointe invalide.')
    const encoded = a.dataUrl.slice(prefix.length)
    if (
      encoded.length > Math.ceil(MAX_ATTACHMENT_BYTES / 3) * 4 ||
      encoded.length % 4 !== 0 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)
    ) {
      throw new Error('Fichier invalide ou trop volumineux (600 Ko maximum).')
    }
    const bytes = Buffer.from(encoded, 'base64')
    if (bytes.toString('base64') !== encoded)
      throw new Error('Pièce jointe invalide.')
    const size = bytes.length
    if (!size || size > MAX_ATTACHMENT_BYTES)
      throw new Error('Le fichier doit contenir entre 1 octet et 600 Ko.')
    attachment = {
      name: a.name.trim().replace(/[\\/\u0000-\u001f]/g, '_'),
      mime: a.mime,
      dataUrl: a.dataUrl,
      size,
    }
  }
  if (!text && !attachment)
    throw new Error('Ajoutez un message ou un document.')
  return { text, attachment }
}
