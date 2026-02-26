function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>InstallOps - Test Page</h1>
      <p>If you can see this, React is working!</p>
      <div style={{ 
        background: '#f0f0f0', 
        padding: '20px', 
        borderRadius: '8px',
        marginTop: '20px'
      }}>
        <h2>Application Status</h2>
        <p>✅ React is rendering</p>
        <p>✅ Vite is working</p>
        <p>✅ TypeScript is compiling</p>
        <p>✅ Development server is running</p>
      </div>
    </div>
  );
}

export default App;
