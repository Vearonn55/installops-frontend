import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Simple test components
function LoginPage() {
  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <h1>InstallOps Login</h1>
      <form>
        <div style={{ marginBottom: '15px' }}>
          <label>Email:</label>
          <input type="email" style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Password:</label>
          <input type="password" style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
        </div>
        <button type="submit" style={{ 
          width: '100%', 
          padding: '10px', 
          backgroundColor: '#3b82f6', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px' 
        }}>
          Sign In
        </button>
      </form>
    </div>
  );
}

function Dashboard() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>InstallOps Dashboard</h1>
      <p>Welcome to the InstallOps platform!</p>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '20px',
        marginTop: '20px'
      }}>
        <div style={{ padding: '20px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
          <h3>Orders</h3>
          <p>Manage installation orders</p>
        </div>
        <div style={{ padding: '20px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
          <h3>Installations</h3>
          <p>Track installation progress</p>
        </div>
        <div style={{ padding: '20px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
          <h3>Inventory</h3>
          <p>Manage warehouse inventory</p>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div>
        <nav style={{ 
          backgroundColor: '#1f2937', 
          color: 'white', 
          padding: '10px 20px',
          marginBottom: '20px'
        }}>
          <h2>InstallOps</h2>
        </nav>
        
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<div style={{ padding: '20px' }}>Page not found</div>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
