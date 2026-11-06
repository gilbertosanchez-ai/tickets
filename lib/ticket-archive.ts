import type JSZip from 'jszip'
import { admin } from './server-auth'

const bucket = 'ticket-archives'

async function ensurePrivateBucket() {
  const existing = await admin.storage.getBucket(bucket)
  if (existing.data?.public === false) return
  if (existing.data?.public) throw new Error('El almacén de boletos debe ser privado.')
  await admin.storage.createBucket(bucket, { public: false })
  const created = await admin.storage.getBucket(bucket)
  if (created.data?.public !== false) throw new Error('No se pudo preparar el almacén privado de boletos.')
}

function archivePath(eventId: string) {
  return `${eventId}/boletos.zip`
}

export async function saveTicketArchive(eventId: string, zip: JSZip) {
  await ensurePrivateBucket()
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  const { error } = await admin.storage.from(bucket).upload(archivePath(eventId), buffer, {
    contentType: 'application/zip',
    upsert: true,
  })
  if (error) throw new Error('No se pudo guardar el ZIP. Intenta generar los boletos de nuevo.')
  const url = await getTicketArchive(eventId)
  if (!url) throw new Error('No se pudo abrir la descarga. Intenta desde Mis eventos.')
  return url
}

export async function getTicketArchive(eventId: string) {
  const { data } = await admin.storage.from(bucket).createSignedUrl(archivePath(eventId), 900, {
    download: 'boletos.zip',
  })
  return data?.signedUrl ?? null
}
