// src/pages/Classrooms.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/config"; // Ensure this path is correct
import {
  collection,
  getDocs,
  addDoc,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";

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
  const [editingClassroomId, setEditingClassroomId] = useState<string | null>(
    null
  );
  const [editingName, setEditingName] = useState("");
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

  const handleStartEdit = (classroom: Classroom) => {
    setEditingClassroomId(classroom.id);
    setEditingName(classroom.name);
  };

  const handleCancelEdit = () => {
    setEditingClassroomId(null);
    setEditingName("");
  };

  const handleUpdateClassroomName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingName.trim() || !editingClassroomId) return;

    try {
      const classroomDocRef = doc(db, "classrooms", editingClassroomId);
      await updateDoc(classroomDocRef, { name: editingName.trim() });

      setClassrooms(
        classrooms
          .map((c) =>
            c.id === editingClassroomId ? { ...c, name: editingName.trim() } : c
          )
          .sort((a, b) => a.name.localeCompare(b.name))
      );

      handleCancelEdit(); // Resetta lo stato di modifica
    } catch (err) {
      console.error("Error updating classroom:", err);
      setError("Errore durante l'aggiornamento della classe.");
    }
  };

  const handleDeleteClassroom = async (
    classroomId: string,
    classroomName: string
  ) => {
    if (
      !window.confirm(
        `Sei sicuro di voler eliminare la classe "${classroomName}"? Questa azione è irreversibile e cancellerà anche tutti gli studenti associati.`
      )
    ) {
      return;
    }

    try {
      // È FONDAMENTALE eliminare prima la sottocollezione degli studenti
      const studentsCollectionRef = collection(
        db,
        "classrooms",
        classroomId,
        "students"
      );
      const studentsSnapshot = await getDocs(studentsCollectionRef);

      const batch = writeBatch(db);
      studentsSnapshot.forEach((studentDoc) => {
        batch.delete(studentDoc.ref);
      });
      await batch.commit(); // Esegui l'eliminazione in batch degli studenti

      // Ora elimina il documento della classe
      await deleteDoc(doc(db, "classrooms", classroomId));

      setClassrooms(classrooms.filter((c) => c.id !== classroomId));
    } catch (err) {
      console.error("Error deleting classroom:", err);
      setError("Errore durante l'eliminazione della classe.");
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
                  className="bg-white p-4 rounded-lg shadow-lg transition-shadow duration-300"
                >
                  {editingClassroomId === classroom.id ? (
                    // --- VISTA MODIFICA ---
                    <form
                      onSubmit={handleUpdateClassroomName}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                      >
                        Salva
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                      >
                        Annulla
                      </button>
                    </form>
                  ) : (
                    // --- VISTA NORMALE ---
                    <div className="flex justify-between items-center group">
                      <span
                        onClick={() => handleClassroomSelect(classroom.id)}
                        className="text-xl font-medium text-gray-700 group-hover:text-indigo-600 cursor-pointer flex-grow"
                      >
                        {classroom.name}
                      </span>
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleStartEdit(classroom)}
                          className="p-2 text-blue-500 hover:bg-blue-100 rounded-full"
                          title="Modifica nome"
                        >
                          {/* SVG Icona Matita */}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                            <path
                              fillRule="evenodd"
                              d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Ferma la navigazione quando si clicca elimina
                            handleDeleteClassroom(classroom.id, classroom.name);
                          }}
                          className="p-2 text-red-500 hover:bg-red-100 rounded-full"
                          title="Elimina classe"
                        >
                          {/* SVG Icona Cestino */}
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
                        <span className="text-indigo-500">&rarr;</span>
                      </div>
                    </div>
                  )}
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
