// src/pages/Display.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase/config"; // Ensure this path is correct
import { doc, onSnapshot, Timestamp } from "firebase/firestore";

interface Selection {
  studentId: string;
  studentName: string;
  studentNumber: number;
  timestamp: Timestamp; // Firestore timestamp
}

const Display: React.FC = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!classroomId) {
      setError("ID classe non specificato.");
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      doc(db, "selections", classroomId),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          setSelection(docSnapshot.data() as Selection);
          setError(null);
        } else {
          setSelection(null);
          //setError("Nessuna selezione trovata per questa classe."); // Or just show "In attesa..."
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error listening to selection:", err);
        setError("Errore nel caricamento della selezione.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [classroomId]);

  let content;

  if (loading) {
    content = (
      <div className="animate-pulse text-5xl font-semibold text-gray-400">
        Caricamento...
      </div>
    );
  } else if (error) {
    content = <div className="text-4xl font-bold text-red-400">{error}</div>;
  } else if (!selection) {
    content = (
      <div className="text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-300 opacity-75">
          In attesa di selezione...
        </h1>
        <svg
          className="w-24 h-24 text-gray-400 mx-auto mt-8 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
    );
  } else {
    content = (
      <div className="text-center bg-white bg-opacity-10 backdrop-blur-md p-8 sm:p-12 md:p-16 rounded-xl shadow-2xl transform scale-100 animate-fadeIn">
        <div
          className="text-8xl sm:text-9xl md:text-[10rem] font-extrabold text-yellow-400 transition-transform duration-500 ease-out"
          style={{
            WebkitTextStroke: "2px black",
            textShadow:
              "3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
          }}
          key={selection.studentId + "_number"} // Force re-render for animation
        >
          {selection.studentNumber}
        </div>
        <div
          className="mt-4 text-5xl sm:text-6xl md:text-7xl font-semibold text-white transition-opacity duration-700 ease-in-out"
          style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.7)" }}
          key={selection.studentId + "_name"} // Force re-render for animation
        >
          {selection.studentName}
        </div>
        <p className="text-sm text-gray-300 mt-6">
          Selezionato il: {selection.timestamp?.toDate().toLocaleString()}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-gray-900 via-purple-900 to-gray-800 text-white flex flex-col items-center justify-center p-4 transition-colors duration-500">
      {content}
      <style>
        {`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.7s ease-out forwards;
        }
        `}
      </style>
    </div>
  );
};

export default Display;
