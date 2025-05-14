// src/App.tsx
import React from "react";
import {
  BrowserRouter as Router, // Or just BrowserRouter
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./pages/Login";
import Classrooms from "./pages/Classrooms";
import Settings from "./pages/Settings";
import Display from "./pages/Display";
// Optional: Add a Navigation component if you want consistent nav across protected pages
// import Navigation from "./components/Navigation";

// Simple auth check
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  // Optional: Wrap children with Navigation or a layout component
  // return <> <Navigation /> {children} </>;
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      {" "}
      {/* Or BrowserRouter */}
      {/* If you have a global Navigation that appears on some pages but not login,
          you might need a more complex layout structure or conditionally render Navigation
          within specific routes or in ProtectedRoute.
          For this example, I'm keeping Navigation out of App.tsx and assuming it's used
          selectively or individual pages handle their own headers.
      */}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/display/:classroomId" element={<Display />} />
        <Route
          path="/classrooms"
          element={
            <ProtectedRoute>
              <Classrooms />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/:classroomId"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        {/* Optional: Add a catch-all 404 route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
