// client/src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DataEntry from './DataEntry';
import Dashboard from './Dashboard';  // Import the new file

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Use the Dashboard component for the homepage */}
        <Route path="/" element={<Dashboard />} />
        
        {/* Keep the Data Entry route */}
        <Route path="/entry" element={<DataEntry />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;