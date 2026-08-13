import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        {/* We can add /student/dashboard, /courses/:id etc. later */}
      </Routes>
    </Router>
  );
}

export default App;
