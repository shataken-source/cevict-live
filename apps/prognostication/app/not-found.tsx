export default function NotFound() {
  return (
    <main style={{ padding: '40px', textAlign: 'center', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>404</h1>
      <p style={{ fontSize: '18px', marginBottom: '30px' }}>Page not found</p>
      <a href="/" style={{ color: '#9333ea', textDecoration: 'underline' }}>Return to home</a>
    </main>
  )
}
