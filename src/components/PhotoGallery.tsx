import { useRef } from 'react'
import { C } from '../lib/tokens'
import { Plus, Trash } from './icons'
import type { ProfilePhoto } from '../lib/types'

// Client-side upload guard mirroring the gallery bucket limits (2 Mo, jpeg/png/webp).
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024
export const ALLOWED_PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/webp']
export function validatePhoto(file: File): string | null {
  if (!ALLOWED_PHOTO_MIMES.includes(file.type)) {
    return 'Format non supporté. Choisis une image JPEG, PNG ou WebP.'
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return 'Image trop lourde (2 Mo maximum). Choisis une image plus légère.'
  }
  return null
}

// Square responsive photo grid. In `editable` mode it shows a leading "+" tile
// (multi-file upload) and a hover trash icon on each photo; in read-only mode it
// just renders the photos (used on another player's profile).
export default function PhotoGallery({
  photos,
  loading,
  editable = false,
  busy = false,
  onAdd,
  onDelete,
}: {
  photos: ProfilePhoto[]
  loading: boolean
  editable?: boolean
  busy?: boolean
  onAdd?: (files: File[]) => void
  onDelete?: (photo: ProfilePhoto) => void
}) {
  const fileInput = useRef<HTMLInputElement | null>(null)

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length) onAdd?.(files)
  }

  if (loading) {
    return <div style={{ fontSize: 13, color: C.muted, marginTop: 13 }}>Chargement des photos…</div>
  }

  // Read-only empty state — nothing to upload, so just say it's empty.
  if (!editable && photos.length === 0) {
    return <div style={{ fontSize: 13, color: C.muted, marginTop: 13 }}>Aucune photo pour le moment.</div>
  }

  return (
    <div style={{ marginTop: 13 }}>
      <div className="tu-gallery-grid">
        {editable && (
          <>
            <button
              type="button"
              onClick={() => !busy && fileInput.current?.click()}
              title="Ajouter des photos"
              style={{
                border: `1.5px dashed ${C.faint}`,
                borderRadius: 14,
                background: C.paper,
                color: C.prune,
                cursor: busy ? 'default' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? (
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    border: `2px solid ${C.faint}`,
                    borderTopColor: C.prune,
                    animation: 'tu-spin .7s linear infinite',
                  }}
                />
              ) : (
                <Plus size={22} stroke={C.prune} />
              )}
              <span style={{ fontSize: 11, fontWeight: 600 }}>{busy ? 'Envoi…' : 'Ajouter'}</span>
            </button>
            <input ref={fileInput} type="file" hidden multiple accept="image/*" onChange={onPick} />
          </>
        )}

        {photos.map((p) => (
          <div key={p.id} style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: C.line }}>
            {p.url && <img src={p.url} alt="" />}
            {editable && (
              <button
                type="button"
                className="tu-gallery-del"
                onClick={() => onDelete?.(p)}
                title="Supprimer la photo"
                style={{
                  position: 'absolute',
                  top: 7,
                  right: 7,
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(28,24,21,.62)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Trash size={15} stroke="#fff" />
              </button>
            )}
          </div>
        ))}
      </div>

      {editable && photos.length === 0 && (
        <div style={{ fontSize: 13, color: C.muted, marginTop: 12 }}>Ajoute tes premières photos.</div>
      )}
    </div>
  )
}
