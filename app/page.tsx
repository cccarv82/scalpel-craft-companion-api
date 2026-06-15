export default function Home() {
  return (
    <main style={{ maxWidth: 720, margin: '4rem auto', padding: '0 1.5rem', lineHeight: 1.6 }}>
      <h1>Scalpel Craft Companion</h1>
      <p>Backend API for the Craft Companion plugin for Scalpel (PoE2 crafting helper with community recipes).</p>
      <p>
        Source:{' '}
        <a href="https://github.com/cccarv82/scalpel-craft-companion" style={{ color: '#f0a020' }}>
          cccarv82/scalpel-craft-companion
        </a>
      </p>
      <h2>Health</h2>
      <p>
        <a href="/api/health" style={{ color: '#f0a020' }}>
          /api/health
        </a>
      </p>
    </main>
  )
}
