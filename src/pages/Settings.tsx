// src/pages/Settings.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase/config"; // Ensure this path is correct
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  setDoc,
  Timestamp,
  orderBy,
  query,
} from "firebase/firestore";

interface Student {
  id: string;
  name: string;
  number: number;
  createdAt?: Timestamp;
}

const Settings: React.FC = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();

  const [classroomName, setClassroomName] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [newStudentName, setNewStudentName] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClassroomAndStudents = useCallback(async () => {
    if (!classroomId) {
      setError("ID Classe non fornito.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const classroomRef = doc(db, "classrooms", classroomId);
      const classroomSnap = await getDoc(classroomRef);

      if (classroomSnap.exists()) {
        setClassroomName(classroomSnap.data().name);
      } else {
        setError("Classe non trovata.");
        setIsLoading(false);
        return;
      }

      const studentsCollection = collection(
        db,
        "classrooms",
        classroomId,
        "students"
      );
      const q = query(studentsCollection, orderBy("number")); // Order by number
      const snapshot = await getDocs(q);
      const studentsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Student[];
      setStudents(studentsList);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Impossibile caricare i dati della classe.");
    } finally {
      setIsLoading(false);
    }
  }, [classroomId]);

  useEffect(() => {
    fetchClassroomAndStudents();
  }, [fetchClassroomAndStudents]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !classroomId) return;

    try {
      const maxNumber =
        students.length > 0 ? Math.max(...students.map((s) => s.number), 0) : 0;
      const studentsCollection = collection(
        db,
        "classrooms",
        classroomId,
        "students"
      );
      const docRef = await addDoc(studentsCollection, {
        name: newStudentName.trim(),
        number: maxNumber + 1,
        createdAt: Timestamp.fromDate(new Date()),
      });
      const newStudent = {
        id: docRef.id,
        name: newStudentName.trim(),
        number: maxNumber + 1,
      };
      setStudents(
        [...students, newStudent].sort((a, b) => a.number - b.number)
      );
      setNewStudentName("");
    } catch (error) {
      console.error("Error adding student:", error);
      alert("Errore durante l'aggiunta dello studente.");
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (
      !classroomId ||
      !window.confirm("Sei sicuro di voler eliminare questo studente?")
    )
      return;
    try {
      await deleteDoc(
        doc(db, "classrooms", classroomId, "students", studentId)
      );
      setStudents(students.filter((student) => student.id !== studentId));
    } catch (error) {
      console.error("Error deleting student:", error);
      alert("Errore durante l'eliminazione dello studente.");
    }
  };

  const handleRandomSelection = () => {
    if (spinning || students.length === 0) return;

    setSpinning(true);
    setSelectedStudent(null); // Clear previous selection immediately

    // Short delay to show "spinning" before picking
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * students.length);
      const tempSelected = students[randomIndex];

      // Actual "spin" duration
      setTimeout(async () => {
        setSelectedStudent(tempSelected);
        setSpinning(false);

        if (classroomId && tempSelected) {
          try {
            await setDoc(doc(db, "selections", classroomId), {
              studentId: tempSelected.id,
              studentName: tempSelected.name,
              studentNumber: tempSelected.number,
              timestamp: Timestamp.fromDate(new Date()),
            });
          } catch (error) {
            console.error("Error saving selection:", error);
            alert("Errore durante il salvataggio della selezione.");
          }
        }
      }, 1800); // This is the "reveal" time, total 200ms + 1800ms = 2s
    }, 200);
  };

  const handleShowDisplay = () => {
    window.open(`/display/${classroomId}`, "_blank", "noopener,noreferrer");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-700 text-xl">
        Caricamento dati classe...
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 text-red-700 p-4">
        <p className="text-2xl font-semibold mb-4">{error}</p>
        <button
          onClick={() => navigate("/classrooms")}
          className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
        >
          Torna alle Classi
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-sky-100 p-4 sm:p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-cyan-500 to-teal-500 pb-2">
            Gestione Classe:{" "}
            <span className="underline decoration-wavy decoration-sky-400">
              {classroomName}
            </span>
          </h1>
        </header>

        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 space-y-3 sm:space-y-0 sm:space-x-4">
          <button
            onClick={() => navigate("/classrooms")}
            className="w-full sm:w-auto px-6 py-3 bg-white border border-sky-500 text-sky-600 rounded-lg shadow-md hover:bg-sky-50 hover:shadow-lg transition-all duration-300 flex items-center justify-center space-x-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span>Torna alle Classi</span>
          </button>
          <button
            onClick={handleShowDisplay}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg shadow-md hover:shadow-xl hover:from-teal-600 hover:to-cyan-600 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
          >
            <span>Apri Schermo Visualizzazione</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path
                fillRule="evenodd"
                d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Selection Area */}
        <section className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl mb-10 text-center">
          <h2 className="text-2xl font-semibold text-gray-700 mb-6">
            Area Selezione Studente
          </h2>
          <div
            className={`h-48 w-48 mx-auto border-4 ${
              spinning
                ? "border-sky-500 animate-spin"
                : "border-dashed border-gray-300"
            } rounded-full flex items-center justify-center mb-6 transition-colors duration-500`}
          >
            {spinning && !selectedStudent && (
              <span className="text-gray-500 text-lg">...</span>
            )}
            {!spinning && selectedStudent && (
              <div className="text-center animate-popIn">
                <div className="text-5xl font-bold text-sky-600">
                  {selectedStudent.number}
                </div>
                <div className="text-2xl text-gray-700 mt-1">
                  {selectedStudent.name}
                </div>
              </div>
            )}
            {!spinning && !selectedStudent && (
              <span className="text-gray-400 text-sm">Pronto?</span>
            )}
          </div>
          <button
            onClick={handleRandomSelection}
            disabled={spinning || students.length === 0}
            className="px-8 py-4 bg-gradient-to-r from-sky-500 to-cyan-400 text-white text-lg font-semibold rounded-lg shadow-lg hover:from-sky-600 hover:to-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:transform-none"
          >
            {spinning
              ? "Selezionando..."
              : students.length === 0
              ? "Aggiungi Studenti"
              : "Seleziona Studente Casuale"}
          </button>
        </section>

        {/* Students Management Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl">
            <h2 className="text-2xl font-semibold text-gray-700 mb-6">
              Studenti{" "}
              <span className="text-base font-normal text-gray-500">
                ({students.length})
              </span>
            </h2>
            {students.length === 0 ? (
              <p className="text-center text-gray-500 py-6">
                Nessuno studente in questa classe. Aggiungine alcuni.
              </p>
            ) : (
              <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {students.map((student) => (
                  <li
                    key={student.id}
                    className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-lg shadow-sm transition-colors duration-200 group"
                  >
                    <div className="flex items-center">
                      <span className="mr-4 px-3 py-1 bg-sky-100 text-sky-700 text-sm font-semibold rounded-full">
                        {student.number}
                      </span>
                      <span className="text-gray-800 font-medium">
                        {student.name}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteStudent(student.id)}
                      className="ml-4 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      title="Elimina studente"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl">
            <form onSubmit={handleAddStudent} className="space-y-5">
              <h3 className="text-2xl font-semibold text-gray-700 mb-1">
                Aggiungi Studente
              </h3>
              <div>
                <label htmlFor="newStudentName" className="sr-only">
                  Nome dello studente
                </label>
                <input
                  id="newStudentName"
                  type="text"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="Es. Mario Rossi"
                  required
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow duration-300 focus:shadow-lg"
                />
              </div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all duration-300 transform hover:scale-105"
              >
                Aggiungi Studente
              </button>
            </form>
          </section>
        </div>
      </div>
      <style>
        {`
        @keyframes popIn {
            0% { transform: scale(0.5); opacity: 0; }
            70% { transform: scale(1.05); opacity: 1; }
            100% { transform: scale(1); }
        }
        .animate-popIn {
            animation: popIn 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards;
        }
        `}
      </style>
    </div>
  );
};

export default Settings;
