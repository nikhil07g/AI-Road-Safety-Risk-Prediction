import React from 'react';

export default function DebugPage() {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#ffffff',
      color: '#000000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ fontSize: '48px', marginBottom: '20px', color: '#2563eb' }}>
        ✅ React App is Loading!
      </h1>
      
      <div style={{
        backgroundColor: '#f0f9ff',
        border: '2px solid #2563eb',
        borderRadius: '8px',
        padding: '20px',
        maxWidth: '600px',
        marginBottom: '20px'
      }}>
        <h2 style={{ color: '#1e40af', marginTop: 0 }}>Frontend Status</h2>
        <ul style={{ textAlign: 'left', lineHeight: '1.8' }}>
          <li>✓ React app is rendering</li>
          <li>✓ Components are loading</li>
          <li>✓ Styling is working</li>
          <li>✓ You should see this text clearly</li>
        </ul>
      </div>

      <div style={{
        backgroundColor: '#f0fdf4',
        border: '2px solid #16a34a',
        borderRadius: '8px',
        padding: '20px',
        maxWidth: '600px',
        marginBottom: '20px'
      }}>
        <h2 style={{ color: '#15803d', marginTop: 0 }}>Next Steps</h2>
        <p style={{ textAlign: 'left' }}>
          The app is working! If you can see this page with clear text and colors,<br/>
          the rendering pipeline is functioning properly.
        </p>
      </div>

      <a href="/" style={{
        display: 'inline-block',
        backgroundColor: '#2563eb',
        color: 'white',
        padding: '12px 24px',
        textDecoration: 'none',
        borderRadius: '6px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        marginTop: '20px'
      }}>
        Go to Landing Page
      </a>
    </div>
  );
}
