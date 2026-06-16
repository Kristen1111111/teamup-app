import { supabase } from './supabase'
import { resizeToSquare, resizeMax } from './images'
import type { ProfilePhoto } from './types'

// Resize → upload to the `avatars` bucket → persist the public URL on the
// profile. Returns the cache-busted public URL.
export async function uploadAvatar(profileId: string, file: File): Promise<string> {
  const blob = await resizeToSquare(file)
  const ts = Date.now()
  const path = `${profileId}/avatar_${ts}.jpg`

  const { error: upErr } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
  if (upErr) throw new Error(`Échec de l'upload de l'avatar : ${upErr.message}`)

  const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
  const url = `${pub.publicUrl}?v=${ts}`

  const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', profileId)
  if (dbErr) throw new Error(`Échec de la mise à jour du profil : ${dbErr.message}`)

  return url
}

// Gallery photos for a profile, with a short-lived signed URL on each row.
// RLS on profile_photos already hides photos from non co-players → returns an
// empty list when the viewer isn't authorized.
export async function listGalleryPhotos(profileId: string): Promise<ProfilePhoto[]> {
  const { data, error } = await supabase
    .from('profile_photos')
    .select('*')
    .eq('profile_id', profileId)
    .order('sort_order')
  if (error) throw new Error(`Échec du chargement de la galerie : ${error.message}`)

  const rows = (data as ProfilePhoto[]) ?? []
  if (rows.length === 0) return rows

  const paths = rows.map((r) => r.storage_path)
  const { data: signed, error: signErr } = await supabase.storage.from('gallery').createSignedUrls(paths, 3600)
  if (signErr) throw new Error(`Échec de la signature des URLs : ${signErr.message}`)

  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]))
  return rows.map((r) => ({ ...r, url: urlByPath.get(r.storage_path) ?? undefined }))
}

// Resize → upload to the `gallery` bucket → insert the row. Returns the new row.
export async function addGalleryPhoto(profileId: string, file: File): Promise<ProfilePhoto> {
  const blob = await resizeMax(file)
  const photoId = crypto.randomUUID()
  const path = `${profileId}/${photoId}.jpg`

  const { error: upErr } = await supabase.storage
    .from('gallery')
    .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
  if (upErr) throw new Error(`Échec de l'upload de la photo : ${upErr.message}`)

  const { data, error: dbErr } = await supabase
    .from('profile_photos')
    .insert({ profile_id: profileId, storage_path: path })
    .select('*')
    .single()
  if (dbErr) throw new Error(`Échec de l'enregistrement de la photo : ${dbErr.message}`)

  return data as ProfilePhoto
}

// Remove the stored object then the row.
export async function deleteGalleryPhoto(photo: ProfilePhoto): Promise<void> {
  const { error: rmErr } = await supabase.storage.from('gallery').remove([photo.storage_path])
  if (rmErr) throw new Error(`Échec de la suppression du fichier : ${rmErr.message}`)

  const { error: dbErr } = await supabase.from('profile_photos').delete().eq('id', photo.id)
  if (dbErr) throw new Error(`Échec de la suppression de la photo : ${dbErr.message}`)
}
