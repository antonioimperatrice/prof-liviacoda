// src/pages/Display.tsx
import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase/config";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import displayImage from "../assets/display.svg";

interface StudentDisplayInfo {
  studentId: string;
  studentName: string;
  studentNumber: number;
}

interface MultiSelectionDoc {
  selectedStudentsList: StudentDisplayInfo[];
  timestamp: Timestamp;
  extractionPoolName?: string;
  classroomName?: string;
}

const Display: React.FC = () => {
  const { classroomId } = useParams<{ classroomId: string }>();

  const [selectionFromFirestore, setSelectionFromFirestore] =
    useState<MultiSelectionDoc | null>(null);
  const [revealedSelection, setRevealedSelection] =
    useState<MultiSelectionDoc | null>(null);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [animatingDisplayValue, setAnimatingDisplayValue] = useState<
    string | number
  >("--");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to convert numbers to Roman numerals
  const toRomanNumeral = (num: number): string => {
    const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    const numerals = [
      "M",
      "CM",
      "D",
      "CD",
      "C",
      "XC",
      "L",
      "XL",
      "X",
      "IX",
      "V",
      "IV",
      "I",
    ];

    let result = "";
    for (let i = 0; i < values.length; i++) {
      while (num >= values[i]) {
        result += numerals[i];
        num -= values[i];
      }
    }
    return result;
  };

  useEffect(() => {
    if (!classroomId) {
      setError("ID classe non specificato.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const selectionDocRef = doc(db, "selections", classroomId);

    const unsubscribe = onSnapshot(
      selectionDocRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data() as MultiSelectionDoc;
          if (
            data.selectedStudentsList &&
            Array.isArray(data.selectedStudentsList)
          ) {
            if (
              revealedSelection?.timestamp?.toMillis() !==
              data.timestamp?.toMillis()
            ) {
              setSelectionFromFirestore(data);
              if (data.selectedStudentsList.length === 0) {
                setRevealedSelection(data);
              } else {
                setRevealedSelection(null);
              }
            } else if (
              !revealedSelection &&
              data.selectedStudentsList.length > 0
            ) {
              setSelectionFromFirestore(data);
              setRevealedSelection(null);
            }
          } else {
            setSelectionFromFirestore(null);
            setRevealedSelection(null);
          }
        } else {
          setSelectionFromFirestore(null);
          setRevealedSelection(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error listening to selection document:", err);
        setError("Errore nel caricamento della selezione in tempo reale.");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [classroomId, revealedSelection]);

  useEffect(() => {
    if (isAnimating) {
      setAnimatingDisplayValue(Math.floor(Math.random() * 90) + 10);
      animationIntervalRef.current = setInterval(() => {
        setAnimatingDisplayValue(Math.floor(Math.random() * 90) + 10);
      }, 100);
    } else {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
      }
    }
    return () => {
      if (animationIntervalRef.current)
        clearInterval(animationIntervalRef.current);
    };
  }, [isAnimating]);

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current)
        clearTimeout(animationTimeoutRef.current);
      if (animationIntervalRef.current)
        clearInterval(animationIntervalRef.current);
    };
  }, []);

  const handleSpin = () => {
    if (
      !selectionFromFirestore ||
      selectionFromFirestore.selectedStudentsList.length === 0
    )
      return;

    setIsAnimating(true);
    setError(null);

    if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);

    animationTimeoutRef.current = setTimeout(() => {
      setIsAnimating(false);
      setRevealedSelection(selectionFromFirestore);
      if (animationIntervalRef.current)
        clearInterval(animationIntervalRef.current);
    }, 3000);
  };

  let content;

  if (loading) {
    content = (
      <div className="animate-pulse text-5xl font-serif font-bold text-gray-300">
        🏛️ Caricamento Arena... 🏛️
      </div>
    );
  } else if (error) {
    content = (
      <div className="text-4xl font-bold text-red-800 p-8 bg-red-100 bg-opacity-90 rounded-lg shadow-xl border-4 border-red-700">
        ⚔️ {error} ⚔️
      </div>
    );
  } else if (isAnimating) {
    content = (
      <div className="text-center p-6 sm:p-8 md:p-10">
        <div className="mb-6">
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-gray-300 mb-2">
            🏛️ L'ARENA 🏛️
          </h2>
        </div>

        <div
          className="text-8xl sm:text-9xl md:text-[12rem] font-extrabold text-amber-600 transition-all duration-100 font-serif"
          style={{
            WebkitTextStroke: "3px #8B4513",
            textShadow: "5px 5px 0 #654321, 3px 3px 0 #8B4513",
          }}
        >
          {typeof animatingDisplayValue === "number"
            ? toRomanNumeral(animatingDisplayValue)
            : animatingDisplayValue}
        </div>

        <p className="text-2xl sm:text-3xl text-gray-300 font-serif animate-pulse mt-4">
          ⚔️ Gli Dei stanno scegliendo... ⚔️
        </p>
      </div>
    );
  } else if (
    revealedSelection &&
    revealedSelection.selectedStudentsList.length > 0
  ) {
    content = (
      <div className="text-center bg-amber-100 bg-opacity-20 backdrop-filter backdrop-blur-lg p-6 sm:p-8 md:p-10 rounded-2xl shadow-2xl w-full max-w-2xl lg:max-w-4xl animate-fadeInOverall border-4 border-amber-700">
        <div className="mb-6">
          <div className="flex justify-center items-center text-4xl mb-2">
            <span className="text-amber-600">🏛️</span>
            {revealedSelection.classroomName && (
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-amber-800 mb-1">
                {revealedSelection.classroomName}
              </h2>
            )}
            <span className="text-amber-600">🏛️</span>
          </div>

          <div className="flex justify-center items-center text-lg text-amber-700 font-serif">
            <span>🏺</span>
            <span className="mx-2">Gli Eletti del Fato</span>
            <span>🏺</span>
          </div>
        </div>

        <div
          className={`space-y-5 sm:space-y-6 max-h-[70vh] overflow-y-auto custom-roman-scrollbar pr-2 ${
            revealedSelection.selectedStudentsList.length === 1
              ? "flex flex-col items-center justify-center"
              : ""
          }`}
        >
          {revealedSelection.selectedStudentsList.map((student, index) => (
            <div
              key={student.studentId || index}
              className="py-4 px-2 rounded-lg transition-all duration-300"
              style={{
                background:
                  "linear-gradient(135deg, rgba(252, 211, 77, 0.9) 0%, rgba(245, 158, 11, 0.8) 100%)",
                border: "3px solid #92400e",
                boxShadow: "0 10px 25px rgba(139, 69, 19, 0.3)",
              }}
            >
              <div
                className="text-6xl sm:text-7xl md:text-8xl font-extrabold text-amber-800 font-serif animate-fadeInItem"
                style={{
                  WebkitTextStroke: "2px #92400e",
                  textShadow: "4px 4px 0 #78350f, 2px 2px 0 #92400e",
                  animationDelay: `${index * 0.1}s`, // Immediate appearance, just slight stagger between students
                }}
              >
                {toRomanNumeral(student.studentNumber)}
              </div>
              <div
                className="mt-1 sm:mt-2 text-3xl sm:text-4xl md:text-5xl font-bold text-amber-900 font-serif animate-fadeInName"
                style={{
                  textShadow: "2px 2px 4px rgba(139, 69, 19, 0.6)",
                  animationDelay: `${index * 0.1 + 2}s`, // 2 seconds after the numeral
                }}
              >
                {student.studentName.toUpperCase()}
              </div>

              <div
                className="flex justify-center items-center mt-3 space-x-2 animate-fadeInName"
                style={{
                  animationDelay: `${index * 0.1 + 2.3}s`, // Appears shortly after name
                }}
              >
                <span className="text-amber-700">⚔️</span>
                <div className="w-16 h-1 bg-amber-700 rounded"></div>
                <span className="text-amber-700">⚔️</span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs sm:text-sm text-amber-800 font-serif mt-6 sm:mt-8">
          <span className="font-bold">Decretum:</span>{" "}
          {revealedSelection.timestamp?.toDate().toLocaleString("it-IT")}
        </p>

        {selectionFromFirestore &&
          selectionFromFirestore.timestamp?.toMillis() !==
            revealedSelection.timestamp?.toMillis() &&
          selectionFromFirestore.selectedStudentsList.length > 0 && (
            <button
              onClick={handleSpin}
              className="mt-8 px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white font-serif font-bold rounded-lg shadow-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-opacity-75 border-2 border-amber-800"
            >
              🏛️ Nuova Estrazione! Consulta l'Oracolo! 🏛️
            </button>
          )}
      </div>
    );
  } else if (
    selectionFromFirestore &&
    selectionFromFirestore.selectedStudentsList.length > 0 &&
    !revealedSelection
  ) {
    content = (
      <div className="text-center p-10">
        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-gray-300 mb-10">
          🏛️ Consulta gli Dei 🏛️
        </h1>
        <button
          onClick={handleSpin}
          className="px-12 py-6 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-2xl sm:text-3xl font-serif font-bold rounded-full shadow-2xl transition-transform transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-amber-400 focus:ring-opacity-75 animate-pulse border-4 border-amber-800"
        >
          🏺 SCOPRI IL FUTURO 🏺
        </button>
      </div>
    );
  } else {
    content = (
      <div className="text-center">
        <h1 className="text-5xl md:text-6xl font-serif font-bold text-gray-300 opacity-75">
          🏛️ Arena in Attesa 🏛️
        </h1>
        <svg
          className="w-24 h-24 text-amber-600 mx-auto mt-8 animate-spin"
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
  }

  return (
    <div className="min-h-screen bg-red-800 text-amber-900 flex flex-col items-center justify-center p-4 transition-colors duration-500 relative">
      {/* SVG Background */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url(${displayImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          filter: "sepia(100%) saturate(150%) hue-rotate(25deg)",
        }}
      />

      {/* Content with higher z-index */}
      <div className="relative z-10">{content}</div>

      <style>{`
        @keyframes fadeInOverall { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeInOverall { animation: fadeInOverall 0.6s ease-out forwards; }
        @keyframes fadeInItem { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeInItem { opacity: 0; animation: fadeInItem 0.8s ease-out forwards; animation-fill-mode: forwards; }
        @keyframes fadeInName { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeInName { opacity: 0; animation: fadeInName 1s ease-out forwards; animation-fill-mode: forwards; }
        .custom-roman-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-roman-scrollbar::-webkit-scrollbar-track { background: rgba(146, 64, 14, 0.1); border-radius: 10px; }
        .custom-roman-scrollbar::-webkit-scrollbar-thumb { background: rgba(146, 64, 14, 0.6); border-radius: 10px; }
        .custom-roman-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(146, 64, 14, 0.8); }
      `}</style>
    </div>
  );
};

export default Display;
