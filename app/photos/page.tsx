'use client'

export default function PhotosPage() {
  const url = process.env.NEXT_PUBLIC_PHOTOS_URL || ''

  return (
    <div className="mx-auto max-w-xl p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Photo Drop — Shared Album</h1>
        <p className="text-sm opacity-80">
          Add your pictures to our shared album so everyone can see them!
        </p>
      </header>

      {!url ? (
        <div className="rounded-xl p-3 bg-amber-500/15 border border-amber-500/30 text-amber-100 text-sm">
          Album link not set. Add <code className="px-1 bg-white/10">NEXT_PUBLIC_PHOTOS_URL</code> in <code className="px-1 bg-white/10">.env.local</code>.
        </div>
      ) : (
        <section className="rounded-2xl bg-white/10 p-4 space-y-3">
          <ol className="list-decimal list-inside space-y-2 text-sm opacity-90">
            <li>Tap the button below to open the shared Google Photos album.</li>
            <li>Sign in with your Google account if prompted.</li>
            <li>
                Tap <b>Add</b> (
                <span
                  className="material-icons"
                  style={{ fontSize: '1em', verticalAlign: 'middle' }}
                >
                  add_photo_alternate
                </span>
                ) icon, at the top of the page, to upload photos or videos.
              </li>
            <li>
              Then tap the{' '}
              <span className="material-icons"
                  style={{ fontSize: '1em', verticalAlign: 'middle' }}>
                cloud_upload
              </span>{' '}
              icon to choose the folder or album where you want to add your pictures from.
            </li>
            <li>Done! Everyone can view the album throughout the night.</li>
          </ol>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-center rounded-lg px-4 py-3 bg-emerald-600 hover:bg-emerald-700"
            >
              Open Shared Album
            </a>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-center rounded-lg px-4 py-3 bg-white/10 hover:bg-white/20"
            >
              View / Add Photos
            </a>
          </div>

          <p className="text-xs opacity-70">
            Note: Uploading requires a Google account (free). Viewing works for anyone with the link.
          </p>
        </section>
      )}

      <section className="rounded-2xl bg-white/5 p-4 space-y-2">
        <h2 className="text-sm font-semibold">Tips</h2>
        <ul className="list-disc list-inside text-sm opacity-90 space-y-1">
          <li>iPhone & Android both supported.</li>
          <li>Video uploads are welcome (Wi-Fi recommended).</li>
          <li>Please keep uploads appropriate—this is a shared space.</li>
        </ul>
      </section>
    </div>
  )
}
