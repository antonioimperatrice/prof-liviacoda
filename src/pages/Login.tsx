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
    <div className="login">
      <h1>Accesso Docente</h1>

      <form onSubmit={handleLogin}>
        {error && <p className="error-message">{error}</p>}

        <div className="form-group">
          <label htmlFor="secretCode">Codice Segreto:</label>
          <input
            type="password"
            id="secretCode"
            value={secretCode}
            onChange={(e) => setSecretCode(e.target.value)}
            required
          />
        </div>

        <button type="submit">Accedi</button>
      </form>
    </div>
  );
};

export default Login;
