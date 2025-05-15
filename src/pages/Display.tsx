// src/pages/Display.tsx
import React, { useEffect, useState, useRef } from "react"; // Aggiunto useRef
import { useParams } from "react-router-dom";
import { db } from "../firebase/config";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";

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
            // Confronta il timestamp per vedere se è una nuova estrazione
            if (
              revealedSelection?.timestamp?.toMillis() !==
              data.timestamp?.toMillis()
            ) {
              setSelectionFromFirestore(data);
              // Se la nuova selezione è vuota (es. pulizia da Settings), rivelala subito senza spin.
              if (data.selectedStudentsList.length === 0) {
                setRevealedSelection(data);
              } else {
                setRevealedSelection(null); // Richiede un nuovo spin per essere rivelata
              }
            } else if (
              !revealedSelection &&
              data.selectedStudentsList.length > 0
            ) {
              // Caso: caricamento iniziale con dati già presenti e non ancora rivelati
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
  }, [classroomId, revealedSelection]); // Aggiunto revealedSelection per il confronto timestamp

  // Effetto per l'animazione dei numeri/simboli
  useEffect(() => {
    if (isAnimating) {
      setAnimatingDisplayValue(Math.floor(Math.random() * 90) + 10); // Numero casuale a 2 cifre
      animationIntervalRef.current = setInterval(() => {
        setAnimatingDisplayValue(Math.floor(Math.random() * 90) + 10);
      }, 100); // Cambia ogni 100ms
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

  // Cleanup timeouts se il componente smonta
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
    setError(null); // Pulisce eventuali errori precedenti

    // Cancella timeout precedente se l'utente clicca di nuovo velocemente (improbabile con UI attuale)
    if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);

    animationTimeoutRef.current = setTimeout(() => {
      setIsAnimating(false);
      setRevealedSelection(selectionFromFirestore); // Rivela la selezione
      if (animationIntervalRef.current)
        clearInterval(animationIntervalRef.current); // Ferma l'intervallo dei numeri
    }, 3000); // Durata dell'animazione di "spin"
  };

  let content;

  if (loading) {
    content = (
      <div className="animate-pulse text-5xl font-semibold text-gray-400">
        {" "}
        Caricamento...{" "}
      </div>
    );
  } else if (error) {
    content = (
      <div className="text-4xl font-bold text-red-400 p-8 bg-red-100 rounded-lg shadow-xl">
        {error}
      </div>
    );
  } else if (isAnimating) {
    content = (
      <div className="text-center p-6 sm:p-8 md:p-10">
        <div
          className="text-8xl sm:text-9xl md:text-[12rem] font-extrabold text-purple-400 transition-all duration-100"
          style={{
            WebkitTextStroke: "2px black",
            textShadow: "3px 3px 0 #1a072e",
          }}
        >
          {animatingDisplayValue}
        </div>
        <p className="text-3xl sm:text-4xl text-white mt-4 animate-pulse">
          Estrazione in corso...
        </p>
      </div>
    );
  } else if (
    revealedSelection &&
    revealedSelection.selectedStudentsList.length > 0
  ) {
    // Mostra gli studenti rivelati
    content = (
      <div className="text-center bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg p-6 sm:p-8 md:p-10 rounded-2xl shadow-2xl w-full max-w-2xl lg:max-w-4xl animate-fadeInOverall">
        {revealedSelection.classroomName && (
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-200 mb-1">
            Classe: {revealedSelection.classroomName}
          </h2>
        )}
        {/* Puoi aggiungere extractionPoolName se lo passi da Settings
        {revealedSelection.extractionPoolName && (
          <h3 className="text-xl sm:text-2xl font-medium text-purple-300 mb-5 sm:mb-8">
            Gruppo: {revealedSelection.extractionPoolName}
          </h3>
        )}*/}
        <div
          className={`space-y-5 sm:space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2 ${
            revealedSelection.selectedStudentsList.length === 1
              ? "flex flex-col items-center justify-center"
              : ""
          }`}
        >
          {revealedSelection.selectedStudentsList.map((student, index) => (
            <div
              key={student.studentId || index}
              className="py-4 px-2 bg-white bg-opacity-5 hover:bg-opacity-10 rounded-lg transition-all duration-300 animate-fadeInItem"
              style={{ animationDelay: `${index * 0.25}s` }}
            >
              <div
                className="text-6xl sm:text-7xl md:text-8xl font-extrabold text-yellow-400"
                style={{
                  WebkitTextStroke: "1.5px black",
                  textShadow:
                    "2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
                }}
              >
                {student.studentNumber}
              </div>
              <div
                className="mt-1 sm:mt-2 text-3xl sm:text-4xl md:text-5xl font-semibold text-white"
                style={{ textShadow: "1.5px 1.5px 3px rgba(0,0,0,0.75)" }}
              >
                {student.studentName}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs sm:text-sm text-gray-400 mt-6 sm:mt-8">
          Estrazione del:{" "}
          {revealedSelection.timestamp?.toDate().toLocaleString("it-IT")}
        </p>
        {/* Bottone per "rigirare" se arriva una nuova estrazione non ancora svelata */}
        {selectionFromFirestore &&
          selectionFromFirestore.timestamp?.toMillis() !==
            revealedSelection.timestamp?.toMillis() &&
          selectionFromFirestore.selectedStudentsList.length > 0 && (
            <button
              onClick={handleSpin}
              className="mt-8 px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75"
            >
              Nuova Estrazione Disponibile! Gira di Nuovo!
            </button>
          )}
      </div>
    );
  } else if (
    selectionFromFirestore &&
    selectionFromFirestore.selectedStudentsList.length > 0 &&
    !revealedSelection
  ) {
    // C'è una selezione da Firestore, ma non è stata ancora rivelata (mostra il pulsante "Gira")
    content = (
      <div className="text-center p-10">
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-10">
          Pronto per l'Estrazione?
        </h1>
        <button
          onClick={handleSpin}
          className="px-12 py-6 bg-purple-600 hover:bg-purple-700 text-white text-2xl sm:text-3xl font-bold rounded-full shadow-2xl transition-transform transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-purple-400 focus:ring-opacity-75 animate-pulse"
        >
          GIRA LA RUOTA!
        </button>
      </div>
    );
  } else {
    // Nessuna selezione valida da Firestore o lista vuota già rivelata
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
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-gray-900 via-purple-900 to-gray-800 text-white flex flex-col items-center justify-center p-4 transition-colors duration-500">
      {content}
      <style>{`
        @keyframes fadeInOverall { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeInOverall { animation: fadeInOverall 0.6s ease-out forwards; }
        @keyframes fadeInItem { from { opacity: 0; transform: translateY(25px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .animate-fadeInItem { opacity: 0; animation: fadeInItem 0.6s ease-out forwards; animation-fill-mode: forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
      `}</style>
    </div>
  );
};

export default Display;
