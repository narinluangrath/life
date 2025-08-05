export default function HomePage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Gmail AI Assistant</h1>
      <p>This is working! Next.js app is running successfully.</p>
      <p>Connect your Gmail account to get started with intelligent email management.</p>
      <a 
        href="/api/auth/google"
        style={{
          display: 'inline-block',
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          backgroundColor: '#4285f4',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '4px',
          marginTop: '1rem',
        }}
      >
        Connect with Google
      </a>
    </div>
  );
}