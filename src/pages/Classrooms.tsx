// src/pages/Classrooms.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/config";
import { collection, getDocs, addDoc } from "firebase/firestore";

interface Classroom {
  id: string;
  name: string;
}

const Classrooms: React.FC = () => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [newClassroomName, setNewClassroomName] = useState("");
  const navigate = useNavigate();

  // Fetch classrooms from Firebase
  useEffect(() => {
    const fetchClassrooms = async () => {
      const classroomsCollection = collection(db, "classrooms");
      const snapshot = await getDocs(classroomsCollection);
      const classroomsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
      }));

      setClassrooms(classroomsList);
    };

    fetchClassrooms();
  }, []);

  // Add a new classroom
  const handleAddClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassroomName.trim()) return;

    try {
      const docRef = await addDoc(collection(db, "classrooms"), {
        name: newClassroomName,
        createdAt: new Date(),
      });

      setClassrooms([...classrooms, { id: docRef.id, name: newClassroomName }]);
      setNewClassroomName("");
    } catch (error) {
      console.error("Error adding classroom:", error);
    }
  };

  // Navigate to settings page for a specific classroom
  const handleClassroomSelect = (classroomId: string) => {
    navigate(`/settings/${classroomId}`);
  };

  return (
    <div className="classrooms">
      <h1>Le Mie Classi</h1>

      <div className="classrooms-list">
        {classrooms.length === 0 ? (
          <p>Nessuna classe trovata. Creane una nuova.</p>
        ) : (
          <ul>
            {classrooms.map((classroom) => (
              <li
                key={classroom.id}
                onClick={() => handleClassroomSelect(classroom.id)}
              >
                {classroom.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={handleAddClassroom} className="add-classroom-form">
        <h2>Aggiungi Nuova Classe</h2>
        <div className="form-group">
          <input
            type="text"
            value={newClassroomName}
            onChange={(e) => setNewClassroomName(e.target.value)}
            placeholder="Nome della classe"
            required
          />
        </div>
        <button type="submit">Aggiungi Classe</button>
      </form>
    </div>
  );
};

export default Classrooms;
