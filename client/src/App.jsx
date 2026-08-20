import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';


import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';

//  checking, is there a token in localStorage? If yes, user is logged in. If no, redirect to login.
const isAuthenticated = () => {
  return localStorage.getItem('token') !== null;
};

// ProtectedRoute: wraps pages that require login, If not logged in, redirects to /login automatically
const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes  anyone can access */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected route only logged in users */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;