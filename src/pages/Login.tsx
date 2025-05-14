// src/pages/Login.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login: React.FC = () => {
  const [secretCode, setSecretCode] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // This is a simple authentication - in a real app, verify against Firebase
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    // Replace 'professor123' with your actual secret code
    if (secretCode === "123") {
      // Store authentication state
      localStorage.setItem("isAuthenticated", "true");
      navigate("/classrooms");
    } else {
      setError("Codice non valido. Riprova.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-center text-blue-600 mb-6">
          Accesso Docente
        </h1>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <p className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-md">
              {error}
            </p>
          )}

          <div className="space-y-2">
            <label
              htmlFor="secretCode"
              className="block text-sm font-medium text-gray-700"
            >
              Codice Segreto:
            </label>
            <input
              type="password"
              id="secretCode"
              value={secretCode}
              onChange={(e) => setSecretCode(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
          >
            Accedi
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
