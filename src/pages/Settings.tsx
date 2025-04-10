// src/pages/Settings.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase/config";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  setDoc,
} from "firebase/firestore";

interface Student {
  id: string;
  name: string;
  number: number;
}

const Settings: React.FC = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();

  const [classroomName, setClassroomName] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [newStudentName, setNewStudentName] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Fetch classroom details and students
  useEffect(() => {
    if (!classroomId) return;

    const fetchClassroomAndStudents = async () => {
      // Get classroom data
      const classroomRef = doc(db, "classrooms", classroomId);
      const classroomSnap = await getDoc(classroomRef);

      if (classroomSnap.exists()) {
        setClassroomName(classroomSnap.data().name);
      }

      // Get students in this classroom
      const studentsCollection = collection(
        db,
        "classrooms",
        classroomId,
        "students"
      );
      const snapshot = await getDocs(studentsCollection);
      const studentsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Student[];

      setStudents(studentsList);
    };

    fetchClassroomAndStudents();
  }, [classroomId]);

  // Add a new student
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !classroomId) return;

    try {
      // Find the next available number
      const maxNumber =
        students.length > 0 ? Math.max(...students.map((s) => s.number)) : 0;

      const studentsCollection = collection(
        db,
        "classrooms",
        classroomId,
        "students"
      );
      const docRef = await addDoc(studentsCollection, {
        name: newStudentName,
        number: maxNumber + 1,
        createdAt: new Date(),
      });

      setStudents([
        ...students,
        { id: docRef.id, name: newStudentName, number: maxNumber + 1 },
      ]);
      setNewStudentName("");
    } catch (error) {
      console.error("Error adding student:", error);
    }
  };

  // Delete a student
  const handleDeleteStudent = async (studentId: string) => {
    if (!classroomId) return;

    try {
      await deleteDoc(
        doc(db, "classrooms", classroomId, "students", studentId)
      );
      setStudents(students.filter((student) => student.id !== studentId));
    } catch (error) {
      console.error("Error deleting student:", error);
    }
  };

  // Select a random student
  const handleRandomSelection = () => {
    if (spinning || students.length === 0) return;

    setSpinning(true);
    setSelectedStudent(null);

    // Select a random student
    setTimeout(async () => {
      const randomIndex = Math.floor(Math.random() * students.length);
      const selected = students[randomIndex];
      setSelectedStudent(selected);
      setSpinning(false);

      // Save selection to Firebase
      if (classroomId) {
        try {
          await setDoc(doc(db, "selections", classroomId), {
            studentId: selected.id,
            studentName: selected.name,
            studentNumber: selected.number,
            timestamp: new Date(),
          });
        } catch (error) {
          console.error("Error saving selection:", error);
        }
      }
    }, 2000);
  };

  // Show the display page in a new window
  const handleShowDisplay = () => {
    window.open(`/display/${classroomId}`, "_blank");
  };

  return (
    <div className="settings">
      <h1>Gestione Classe: {classroomName}</h1>

      <div className="actions-bar">
        <button onClick={() => navigate("/classrooms")}>
          ← Torna alle Classi
        </button>
        <button onClick={handleShowDisplay}>
          Apri Schermo di Visualizzazione
        </button>
      </div>

      <div className="selection-area">
        <div className={`roulette-wheel ${spinning ? "spinning" : ""}`}>
          {selectedStudent && (
            <div className="result">
              <div className="student-number">{selectedStudent.number}</div>
              <div className="student-name">{selectedStudent.name}</div>
            </div>
          )}
        </div>

        <button
          className="spin-button"
          onClick={handleRandomSelection}
          disabled={spinning || students.length === 0}
        >
          {spinning ? "Selezionando..." : "Seleziona Studente Casuale"}
        </button>
      </div>

      <div className="students-section">
        <h2>Studenti ({students.length})</h2>

        <div className="students-list">
          {students.length === 0 ? (
            <p>Nessuno studente in questa classe. Aggiungine alcuni.</p>
          ) : (
            <ul>
              {students.map((student) => (
                <li key={student.id}>
                  <span className="student-number">{student.number}</span>
                  <span className="student-name">{student.name}</span>
                  <button
                    className="delete-button"
                    onClick={() => handleDeleteStudent(student.id)}
                  >
                    Elimina
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={handleAddStudent} className="add-student-form">
          <h3>Aggiungi Nuovo Studente</h3>
          <div className="form-group">
            <input
              type="text"
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              placeholder="Nome dello studente"
              required
            />
          </div>
          <button type="submit">Aggiungi</button>
        </form>
      </div>
    </div>
  );
};

export default Settings;
