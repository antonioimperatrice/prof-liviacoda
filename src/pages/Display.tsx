// src/pages/Display.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase/config";
import { doc, onSnapshot } from "firebase/firestore";

interface Selection {
  studentId: string;
  studentName: string;
  studentNumber: number;
  timestamp: any;
}

const Display: React.FC = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classroomId) return;

    // Listen for real-time updates to the selected student
    const unsubscribe = onSnapshot(
      doc(db, "selections", classroomId),
      (doc) => {
        if (doc.exists()) {
          setSelection(doc.data() as Selection);
        } else {
          setSelection(null);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [classroomId]);

  return (
    <div className="display">
      {loading ? (
        <div className="loading">Caricamento...</div>
      ) : !selection ? (
        <div className="no-selection">
          <h1>In attesa di selezione...</h1>
        </div>
      ) : (
        <div className="selection-display">
          <div className="student-number">{selection.studentNumber}</div>
          <div className="student-name">{selection.studentName}</div>
        </div>
      )}
    </div>
  );
};

export default Display;
