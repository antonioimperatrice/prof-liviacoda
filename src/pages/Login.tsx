// src/pages/Login.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login: React.FC = () => {
  const [secretCode, setSecretCode] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, verify against Firebase Auth or your backend
    if (secretCode === "123") {
      // Replace '123' with your actual secure check
      localStorage.setItem("isAuthenticated", "true");
      navigate("/classrooms");
    } else {
      setError("Codice non valido. Riprova.");
      setSecretCode(""); // Clear input on error
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 flex flex-col justify-center items-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md transform transition-all hover:scale-105 duration-300">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Accesso Docente
        </h1>
        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <p className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md text-sm text-center">
              {error}
            </p>
          )}
          <div>
            <label
              htmlFor="secretCode"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Codice Segreto:
            </label>
            <input
              type="password"
              id="secretCode"
              value={secretCode}
              onChange={(e) => setSecretCode(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition-shadow duration-300 focus:shadow-lg"
              placeholder="********"
            />
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-transform transform hover:scale-105 duration-300"
          >
            Accedi
          </button>
        </form>
      </div>
      <footer className="text-center text-white text-opacity-80 mt-8 text-sm">
        Interrogazioni App &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default Login;
