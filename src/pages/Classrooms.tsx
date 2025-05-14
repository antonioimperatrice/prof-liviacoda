// src/pages/Classrooms.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/config"; // Ensure this path is correct
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";

interface Classroom {
  id: string;
  name: string;
  createdAt?: Timestamp; // Optional: if you store it
}

const Classrooms: React.FC = () => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [newClassroomName, setNewClassroomName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClassrooms = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const classroomsCollection = collection(db, "classrooms");
        const snapshot = await getDocs(classroomsCollection);
        const classroomsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          createdAt: doc.data().createdAt,
        }));
        // Sort classrooms, perhaps by name or createdAt
        classroomsList.sort((a, b) => a.name.localeCompare(b.name));
        setClassrooms(classroomsList);
      } catch (err) {
        console.error("Error fetching classrooms:", err);
        setError("Impossibile caricare le classi. Riprova più tardi.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchClassrooms();
  }, []);

  const handleAddClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassroomName.trim()) return;
    try {
      const docRef = await addDoc(collection(db, "classrooms"), {
        name: newClassroomName.trim(),
        createdAt: Timestamp.fromDate(new Date()),
      });
      // Add to local state, maintaining sort order or re-fetch
      const newClassroom = { id: docRef.id, name: newClassroomName.trim() };
      setClassrooms(
        [...classrooms, newClassroom].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
      setNewClassroomName("");
    } catch (error) {
      console.error("Error adding classroom:", error);
      setError("Errore durante l'aggiunta della classe.");
    }
  };

  const handleClassroomSelect = (classroomId: string) => {
    navigate(`/settings/${classroomId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 pb-2">
          Le Mie Classi
        </h1>
      </header>

      {isLoading && (
        <p className="text-center text-gray-600">Caricamento classi...</p>
      )}
      {error && (
        <p className="text-center text-red-500 bg-red-100 p-3 rounded-md">
          {error}
        </p>
      )}

      {!isLoading && !error && (
        <div className="max-w-2xl mx-auto">
          {classrooms.length === 0 ? (
            <p className="text-center text-gray-500 text-lg py-10">
              Nessuna classe trovata. Creane una nuova per iniziare!
            </p>
          ) : (
            <ul className="space-y-4 mb-10">
              {classrooms.map((classroom) => (
                <li
                  key={classroom.id}
                  onClick={() => handleClassroomSelect(classroom.id)}
                  className="bg-white p-5 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 cursor-pointer flex justify-between items-center group"
                >
                  <span className="text-xl font-medium text-gray-700 group-hover:text-indigo-600">
                    {classroom.name}
                  </span>
                  <span className="text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    &rarr;
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <form
        onSubmit={handleAddClassroom}
        className="max-w-lg mx-auto mt-10 p-6 bg-white rounded-xl shadow-2xl space-y-4"
      >
        <h2 className="text-2xl font-semibold text-gray-700 text-center">
          Aggiungi Nuova Classe
        </h2>
        <div>
          <label htmlFor="newClassroomName" className="sr-only">
            Nome della classe
          </label>
          <input
            id="newClassroomName"
            type="text"
            value={newClassroomName}
            onChange={(e) => setNewClassroomName(e.target.value)}
            placeholder="Es. 'Matematica 5B'"
            required
            className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow duration-300 focus:shadow-lg"
          />
        </div>
        <button
          type="submit"
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-transform transform hover:scale-105 duration-300"
        >
          Aggiungi Classe
        </button>
      </form>
    </div>
  );
};

export default Classrooms;
