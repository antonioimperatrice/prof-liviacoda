// src/pages/Settings.tsx
import React, { useEffect, useState, useCallback } from "react";
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
  Timestamp,
  orderBy,
  query,
  writeBatch,
  updateDoc, // Import writeBatch
} from "firebase/firestore";

interface Student {
  id: string;
  name: string;
  number: number;
  dsa?: boolean;
  createdAt?: Timestamp;
}

const Settings: React.FC = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();

  const [classroomName, setClassroomName] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [numToSelect, setNumToSelect] = useState<number>(1);
  const [eligibilityPerSlot, setEligibilityPerSlot] = useState<
    Array<Set<string>>
  >([new Set()]);
  const [currentConfiguringSlotIndex, setCurrentConfiguringSlotIndex] =
    useState<number>(0);
  const [spinning, setSpinning] = useState<boolean>(false);
  const [selectedStudentsDisplay, setSelectedStudentsDisplay] = useState<
    Student[] | null
  >(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [newStudentNameForClass, setNewStudentNameForClass] =
    useState<string>("");
  const [newStudentIsDSA, setNewStudentIsDSA] = useState<boolean>(false);

  const fetchClassroomAndStudents = useCallback(async () => {
    if (!classroomId) {
      setError("ID Classe non fornito.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    setSelectedStudentsDisplay(null);
    try {
      const classroomDocRef = doc(db, "classrooms", classroomId);
      const classroomSnap = await getDoc(classroomDocRef);
      if (classroomSnap.exists()) setClassroomName(classroomSnap.data().name);
      else {
        setError("Classe non trovata.");
        navigate("/classrooms", { replace: true });
        setIsLoading(false);
        return;
      }

      const studentsCollRef = collection(
        db,
        "classrooms",
        classroomId,
        "students"
      );
      const q = query(studentsCollRef, orderBy("number"));
      const studentsSnapshot = await getDocs(q);
      const fetchedStudents = studentsSnapshot.docs.map((sDoc) => ({
        id: sDoc.id,
        ...sDoc.data(),
      })) as Student[];

      setStudents(fetchedStudents);

      if (fetchedStudents.length > 0) {
        setCurrentConfiguringSlotIndex(0);
      } else {
        setNumToSelect(1);
        setCurrentConfiguringSlotIndex(0);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Impossibile caricare i dati della classe.");
    } finally {
      setIsLoading(false);
    }
  }, [classroomId, navigate]);

  useEffect(() => {
    fetchClassroomAndStudents();
  }, [fetchClassroomAndStudents]);

  useEffect(() => {
    if (isLoading && students.length === 0) {
      // This part handles re-initializing eligibilityPerSlot to empty sets
      // if numToSelect changes while still loading and before students are fetched.
      // This can remain as is.
      if (
        numToSelect > 0 &&
        (!eligibilityPerSlot ||
          eligibilityPerSlot.length !== numToSelect ||
          eligibilityPerSlot.some((s) => s.size > 0))
      ) {
        setEligibilityPerSlot(
          Array.from({ length: numToSelect }, () => new Set<string>())
        );
      }
      return;
    }

    const studentIdsInClass = new Set(students.map((s) => s.id));

    setEligibilityPerSlot((prevSlots) => {
      const newCalculatedSlots = Array.from({ length: numToSelect }, (_, i) => {
        const existingSlotMembers = prevSlots[i];

        if (existingSlotMembers && i < prevSlots.length) {
          // If the slot previously existed:
          // - If it already had members, or if there are no students in the class,
          //   then filter its current members against the (potentially updated) student list.
          // - If it existed but was empty AND there ARE students in the class,
          //   then populate it with all students (this is the key change for slot 0).
          if (existingSlotMembers.size > 0 || studentIdsInClass.size === 0) {
            return new Set(
              [...existingSlotMembers].filter((id) => studentIdsInClass.has(id))
            );
          } else {
            // Slot existed, was empty, but there are students in class. Populate it.
            return new Set(studentIdsInClass);
          }
        } else {
          // This is a new slot (e.g., numToSelect increased, or prevSlots was shorter).
          // Initialize with all students from the current class list.
          return new Set(studentIdsInClass);
        }
      });
      return newCalculatedSlots;
    }); // This logic for adjusting the currently configured slot index can remain as is.

    if (numToSelect > 0) {
      if (
        currentConfiguringSlotIndex >= numToSelect ||
        currentConfiguringSlotIndex < 0
      ) {
        setCurrentConfiguringSlotIndex(0);
      }
    } else {
      setCurrentConfiguringSlotIndex(0); // Default to 0 if numToSelect is 0 or less
    }
  }, [numToSelect, students, isLoading]); // Removed eligibilityPerSlot from deps as we use functional updates for setEligibilityPerSlot

  const handleToggleEligibilityForSlot = (studentId: string) => {
    if (
      currentConfiguringSlotIndex < 0 ||
      currentConfiguringSlotIndex >= eligibilityPerSlot.length
    )
      return;
    setEligibilityPerSlot((prevEligibility) =>
      prevEligibility.map((slotEligibles, index) => {
        if (index === currentConfiguringSlotIndex) {
          const newSet = new Set(slotEligibles);
          if (newSet.has(studentId)) newSet.delete(studentId);
          else newSet.add(studentId);
          return newSet;
        }
        return slotEligibles;
      })
    );
  };

  const handleSelectAllForCurrentSlot = () => {
    if (
      currentConfiguringSlotIndex < 0 ||
      currentConfiguringSlotIndex >= eligibilityPerSlot.length ||
      students.length === 0
    )
      return;
    const allStudentIdsInClass = new Set(students.map((s) => s.id));
    setEligibilityPerSlot((prevEligibility) =>
      prevEligibility.map((slotEligibles, index) =>
        index === currentConfiguringSlotIndex
          ? new Set(allStudentIdsInClass)
          : slotEligibles
      )
    );
  };

  const handleDeselectAllForCurrentSlot = () => {
    if (
      currentConfiguringSlotIndex < 0 ||
      currentConfiguringSlotIndex >= eligibilityPerSlot.length
    )
      return;
    setEligibilityPerSlot((prevEligibility) =>
      prevEligibility.map((slotEligibles, index) =>
        index === currentConfiguringSlotIndex
          ? new Set<string>()
          : slotEligibles
      )
    );
  };

  const handleSelectOnlyDSA = () => {
    if (
      currentConfiguringSlotIndex < 0 ||
      currentConfiguringSlotIndex >= eligibilityPerSlot.length ||
      students.length === 0
    )
      return;

    // 1. Trova gli ID di tutti gli studenti DSA
    const dsaStudentIds = students.filter((s) => s.dsa).map((s) => s.id);

    // 2. Aggiorna lo stato, aggiungendo questi ID al set dello slot corrente
    setEligibilityPerSlot((prevEligibility) =>
      prevEligibility.map((slotEligibles, index) => {
        if (index === currentConfiguringSlotIndex) {
          const newSet = new Set(slotEligibles);
          dsaStudentIds.forEach((id) => newSet.add(id)); // Aggiungi ogni ID
          return newSet;
        }
        return slotEligibles;
      })
    );
  };

  const handleDeselectOnlyDSA = () => {
    if (
      currentConfiguringSlotIndex < 0 ||
      currentConfiguringSlotIndex >= eligibilityPerSlot.length ||
      students.length === 0
    )
      return;

    // 1. Trova gli ID di tutti gli studenti DSA
    const dsaStudentIds = students.filter((s) => s.dsa).map((s) => s.id);

    // 2. Aggiorna lo stato, rimuovendo questi ID dal set dello slot corrente
    setEligibilityPerSlot((prevEligibility) =>
      prevEligibility.map((slotEligibles, index) => {
        if (index === currentConfiguringSlotIndex) {
          const newSet = new Set(slotEligibles);
          dsaStudentIds.forEach((id) => newSet.delete(id)); // Rimuovi ogni ID
          return newSet;
        }
        return slotEligibles;
      })
    );
  };

  const handleCopyFirstSlotEligibilityToOthers = () => {
    if (
      numToSelect <= 1 ||
      !eligibilityPerSlot[0] ||
      students.length === 0 ||
      spinning
    ) {
      // Button should ideally be disabled, but this is a safeguard
      return;
    }

    const firstSlotEligibilitySnapshot = new Set(eligibilityPerSlot[0]); // Get a stable copy

    setEligibilityPerSlot((prevEligibility) => {
      return prevEligibility.map((currentSlotSet, index) => {
        if (index === 0) {
          return currentSlotSet; // The first slot remains as is
        }
        // For all other slots, apply a new Set instance with the first slot's eligibility
        return new Set(firstSlotEligibilitySnapshot);
      });
    });
    // Optionally, clear any general error messages if you have a generic error state for this section
    // setError(null);
  };

  const handleAddStudentToClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentNameForClass.trim() || !classroomId) return;
    const newNumber =
      students.length > 0
        ? Math.max(...students.map((s) => s.number), 0) + 1
        : 1;
    const studentData = {
      name: newStudentNameForClass.trim(),
      number: newNumber,
      dsa: newStudentIsDSA,
      createdAt: Timestamp.fromDate(new Date()),
    };
    try {
      const docRef = await addDoc(
        collection(db, "classrooms", classroomId, "students"),
        studentData
      );
      setStudents((prev) =>
        [...prev, { id: docRef.id, ...studentData }].sort(
          (a, b) => a.number - b.number
        )
      );
      setNewStudentNameForClass("");
      setNewStudentIsDSA(false);
    } catch (err) {
      console.error(err);
      setError("Errore aggiunta studente.");
    }
  };

  const handleDeleteStudentFromClass = async (studentId: string) => {
    const name = students.find((s) => s.id === studentId)?.name || "studente";
    if (
      !window.confirm(
        `Eliminare ${name} dalla classe? Verrà rimosso da tutte le liste di idoneità per slot.`
      )
    )
      return;
    if (!classroomId) return;
    try {
      await deleteDoc(
        doc(db, "classrooms", classroomId, "students", studentId)
      );
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
      setSelectedStudentsDisplay((prev) =>
        prev ? prev.filter((s) => s.id !== studentId) : null
      );
      // Note: Student numbers are not re-sequenced here.
      // If sequential numbers are strictly needed after deletion,
      // you would need to update all subsequent students' numbers.
    } catch (err) {
      console.error(err);
      setError(`Errore eliminazione ${name}.`);
    }
  };

  const handleToggleDSA = async (studentId: string, currentStatus: boolean) => {
    if (!classroomId || spinning) return;

    const studentDocRef = doc(
      db,
      "classrooms",
      classroomId,
      "students",
      studentId
    );

    try {
      // Aggiorna il DB
      await updateDoc(studentDocRef, { dsa: !currentStatus });

      // Aggiorna lo stato locale per una UI reattiva
      setStudents((prevStudents) =>
        prevStudents.map((s) =>
          s.id === studentId ? { ...s, dsa: !currentStatus } : s
        )
      );
    } catch (err) {
      console.error("Error toggling DSA status:", err);
      setError("Errore durante l'aggiornamento dello stato DSA.");
    }
  };

  // --- START: New function to handle student reordering ---
  const handleMoveStudent = async (
    studentIdToMove: string,
    direction: "up" | "down"
  ) => {
    if (!classroomId || spinning) return;

    const currentIndex = students.findIndex((s) => s.id === studentIdToMove);
    if (currentIndex === -1) return;

    let targetIndex;
    if (direction === "up") {
      if (currentIndex === 0) return; // Already at the top
      targetIndex = currentIndex - 1;
    } else {
      // direction === "down"
      if (currentIndex === students.length - 1) return; // Already at the bottom
      targetIndex = currentIndex + 1;
    }

    const studentToMove = students[currentIndex];
    const studentToSwapWith = students[targetIndex];

    // The numbers to be swapped
    const newNumberForStudentToMove = studentToSwapWith.number;
    const newNumberForStudentToSwapWith = studentToMove.number;

    const studentToMoveRef = doc(
      db,
      "classrooms",
      classroomId,
      "students",
      studentToMove.id
    );
    const studentToSwapWithRef = doc(
      db,
      "classrooms",
      classroomId,
      "students",
      studentToSwapWith.id
    );

    try {
      setError(null);
      const batch = writeBatch(db);
      batch.update(studentToMoveRef, { number: newNumberForStudentToMove });
      batch.update(studentToSwapWithRef, {
        number: newNumberForStudentToSwapWith,
      });
      await batch.commit();

      // Update local state
      setStudents((prevStudents) => {
        const updatedStudents = prevStudents.map((s) => {
          if (s.id === studentToMove.id) {
            return { ...s, number: newNumberForStudentToMove };
          }
          if (s.id === studentToSwapWith.id) {
            return { ...s, number: newNumberForStudentToSwapWith };
          }
          return s;
        });
        return updatedStudents.sort((a, b) => a.number - b.number);
      });
    } catch (err) {
      console.error("Error reordering students:", err);
      setError("Errore durante il riordino degli studenti.");
      // Optionally, re-fetch students to ensure consistency if an error occurs
      // await fetchClassroomAndStudents();
    }
  };
  // --- END: New function to handle student reordering ---

  const handleRandomSelection = () => {
    // ... (your existing handleRandomSelection function, unchanged)
    setError(null);
    if (spinning) return;
    if (numToSelect <= 0) {
      setError("Seleziona almeno uno studente da estrarre.");
      return;
    }

    let canProceed = true;
    if (eligibilityPerSlot.length !== numToSelect) {
      setError(
        "Configurazione slot non allineata. Attendi o modifica N. studenti."
      );
      canProceed = false;
    } else {
      for (let i = 0; i < numToSelect; i++) {
        if (!eligibilityPerSlot[i] || eligibilityPerSlot[i].size === 0) {
          setError(`Il ${i + 1}° slot non ha studenti idonei configurati.`);
          canProceed = false;
          break;
        }
      }
    }
    if (!canProceed) return;

    setSpinning(true);
    setSelectedStudentsDisplay(null);

    setTimeout(() => {
      const finalSelected: Student[] = [];
      const pickedIdsInThisRound: Set<string> = new Set();
      let notEnoughUnique = false;
      for (let i = 0; i < numToSelect; i++) {
        const slotEligiblesSet = eligibilityPerSlot[i];
        if (!slotEligiblesSet) {
          notEnoughUnique = true;
          break;
        }
        const availableCandidates = students.filter(
          (s) => slotEligiblesSet.has(s.id) && !pickedIdsInThisRound.has(s.id)
        );
        if (availableCandidates.length > 0) {
          const chosen =
            availableCandidates[
              Math.floor(Math.random() * availableCandidates.length)
            ];
          finalSelected.push(chosen);
          pickedIdsInThisRound.add(chosen.id);
        } else {
          notEnoughUnique = true;
          break;
        }
      }

      setTimeout(() => {
        if (notEnoughUnique && finalSelected.length < numToSelect) {
          setError(
            `Estrazione parziale: ${finalSelected.length}/${numToSelect}. Candidati unici esauriti.`
          );
        }
        setSelectedStudentsDisplay(finalSelected);
        setSpinning(false);

        if (classroomId) {
          setDoc(doc(db, "selections", classroomId), {
            selectedStudentsList: finalSelected.map((s) => ({
              studentId: s.id,
              studentName: s.name,
              studentNumber: s.number,
            })),
            timestamp: Timestamp.fromDate(new Date()),
            classroomName: classroomName,
          }).catch((errFS) => {
            console.error(
              "Error saving/clearing 'selections' document in Firestore:",
              errFS
            );
            setError(
              "Errore nel comunicare l'estrazione alla pagina di visualizzazione."
            );
          });
        }
      }, 1200);
    }, 200);
  };

  const handleClearExtractionResults = () => {
    setSelectedStudentsDisplay(null);
    setError(null);
    if (classroomId) {
      setDoc(doc(db, "selections", classroomId), {
        selectedStudentsList: [],
        timestamp: Timestamp.fromDate(new Date()),
        classroomName: classroomName,
      }).catch((errFS) => {
        console.error(
          "Error clearing 'selections' document via button:",
          errFS
        );
        setError(
          "Errore nel pulire la visualizzazione remota dell'estrazione."
        );
      });
    }
  };

  const handleShowDisplay = () => {
    if (!classroomId) {
      setError("ID classe non trovato.");
      return;
    }
    window.open(`/display/${classroomId}`, "_blank", "noopener,noreferrer");
  };

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center text-xl text-gray-600">
        Caricamento...
      </div>
    );
  const currentEligibleSetForConfig =
    eligibilityPerSlot[currentConfiguringSlotIndex] || new Set<string>();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-sky-100 p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* ... (Header and Error display remain the same) ... */}
        <header className="mb-6 sm:mb-8 relative text-center">
          <button
            onClick={() => navigate("/classrooms")}
            className="absolute top-0 left-0 mt-1 ml-1 sm:mt-0 sm:ml-0 px-3 py-2 text-sm bg-white border border-sky-500 text-sky-600 rounded-lg shadow-sm hover:bg-sky-50 transition-all flex items-center"
            title="Torna alle Classi"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Classi
          </button>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-cyan-500 to-teal-500 py-1">
            Gestione:{" "}
            <span className="decoration-sky-400">{classroomName}</span>
          </h1>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-3 sm:p-4 rounded-md shadow"
          >
            <p className="font-bold">Attenzione:</p>
            <p className="text-sm sm:text-base">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Colonna Sinistra: Configurazione Slot e Idoneità */}
          <div className="lg:col-span-1 space-y-6 sm:space-y-8">
            {/* ... (Imposta Estrazione and Configura Idoneità per Slot sections remain largely the same, ensure to pass `spinning` to disable elements) ... */}
            <section className="p-3 sm:p-4 bg-white rounded-xl shadow-xl">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-3">
                Imposta Estrazione
              </h2>
              <div>
                <label
                  htmlFor="numToSelectSlots"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  N. studenti da estrarre:
                </label>
                <select
                  id="numToSelectSlots"
                  value={numToSelect}
                  onChange={(e) => {
                    const newN = parseInt(e.target.value, 10);
                    setNumToSelect(newN);
                    setSelectedStudentsDisplay(null); // Clear results when count changes
                  }}
                  disabled={spinning || students.length === 0}
                  className="mt-1 block w-full pl-3 pr-8 py-2 text-sm sm:text-base border-gray-300 focus:outline-none focus:ring-sky-500 focus:border-sky-500 rounded-md disabled:bg-gray-100"
                >
                  {students.length > 0 ? (
                    Array.from(
                      { length: Math.min(students.length, 10) }, // Max 10 or total students
                      (_, i) => i + 1
                    ).map((num) => (
                      <option key={num} value={num}>
                        {num}
                      </option>
                    ))
                  ) : (
                    <option value="1" disabled>
                      N/A
                    </option>
                  )}
                </select>
              </div>
            </section>

            {numToSelect > 0 &&
              students.length > 0 &&
              eligibilityPerSlot.length === numToSelect && (
                <section className="p-3 sm:p-4 bg-white rounded-xl shadow-xl">
                  <h3 className="text-md sm:text-lg font-semibold text-gray-700 mb-3">
                    Configura Idoneità per Slot
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-3 border-b pb-3 items-center">
                    {Array.from({ length: numToSelect }, (_, i) => i).map(
                      (slotIndex) => (
                        <button
                          key={slotIndex}
                          onClick={() =>
                            setCurrentConfiguringSlotIndex(slotIndex)
                          }
                          disabled={spinning}
                          className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors disabled:opacity-70 ${
                            currentConfiguringSlotIndex === slotIndex
                              ? "bg-sky-600 text-white shadow-md"
                              : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                          }`}
                        >
                          {slotIndex + 1}° Estratto{" "}
                          <span className="text-xs opacity-80">
                            ({eligibilityPerSlot[slotIndex]?.size || 0})
                          </span>
                        </button>
                      )
                    )}
                  </div>
                  {numToSelect > 1 && eligibilityPerSlot[0] && (
                    <div className="mb-4">
                      {" "}
                      {/* Add some margin below */}
                      <button
                        onClick={handleCopyFirstSlotEligibilityToOthers}
                        disabled={spinning || students.length === 0}
                        className="w-full px-3 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-600 hover:to-cyan-500 rounded-lg shadow-lg disabled:opacity-60 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                        title="Copia la configurazione di idoneità del primo slot a tutti gli altri slot"
                      >
                        Copia Idoneità 1° Slot agli Altri
                      </button>
                    </div>
                  )}
                  {eligibilityPerSlot[currentConfiguringSlotIndex] !==
                  undefined ? (
                    <>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-medium text-gray-600">
                          Idonei per{" "}
                          <span className="font-bold text-sky-600">
                            {currentConfiguringSlotIndex + 1}° Estratto
                          </span>
                          :
                        </h4>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">
                        Conteggio: {currentEligibleSetForConfig.size} /{" "}
                        {students.length}
                      </p>
                      {/* Container per tutti i pulsanti di selezione/deselezione */}
                      <div className="space-y-2 mb-3">
                        {/* Prima riga: Seleziona/Deseleziona Tutti */}
                        <div className="flex gap-2">
                          <button
                            onClick={handleSelectAllForCurrentSlot}
                            className="flex-1 px-2 py-1.5 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded-md border border-green-300 disabled:opacity-50"
                            disabled={students.length === 0 || spinning}
                          >
                            Selez. Tutti
                          </button>
                          <button
                            onClick={handleDeselectAllForCurrentSlot}
                            className="flex-1 px-2 py-1.5 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded-md border border-red-300 disabled:opacity-50"
                            disabled={
                              students.length === 0 ||
                              currentEligibleSetForConfig.size === 0 ||
                              spinning
                            }
                          >
                            Deselez. Tutti
                          </button>
                        </div>

                        {/* Seconda riga: Pulsanti specifici per DSA */}
                        <div className="flex gap-2">
                          <button
                            onClick={handleSelectOnlyDSA}
                            className="flex-1 px-2 py-1.5 text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-md border border-orange-300 disabled:opacity-50"
                            disabled={!students.some((s) => s.dsa) || spinning}
                            title="Aggiungi tutti gli studenti DSA alla lista degli idonei"
                          >
                            Selez. DSA
                          </button>
                          <button
                            onClick={handleDeselectOnlyDSA}
                            className="flex-1 px-2 py-1.5 text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-md border border-orange-300 disabled:opacity-50"
                            disabled={!students.some((s) => s.dsa) || spinning}
                            title="Rimuovi tutti gli studenti DSA dalla lista degli idonei"
                          >
                            Deselez. DSA
                          </button>
                        </div>
                      </div>
                      <ul className="space-y-1.5 max-h-80 overflow-y-auto custom-scrollbar pr-1.5">
                        {students.map((student) => (
                          <li
                            key={`${student.id}-slot-${currentConfiguringSlotIndex}`}
                            className={`flex items-center p-2 rounded-md hover:bg-gray-100 transition-colors text-sm ${
                              currentEligibleSetForConfig.has(student.id)
                                ? "bg-green-50"
                                : "bg-red-50 opacity-80"
                            }`}
                          >
                            <input
                              type="checkbox"
                              id={`s-${currentConfiguringSlotIndex}-${student.id}`}
                              checked={currentEligibleSetForConfig.has(
                                student.id
                              )}
                              onChange={() =>
                                handleToggleEligibilityForSlot(student.id)
                              }
                              disabled={spinning}
                              className="form-checkbox h-4 w-4 sm:h-5 sm:w-5 text-sky-600 border-gray-300 rounded focus:ring-sky-500 cursor-pointer mr-2 sm:mr-2.5 shrink-0"
                            />
                            <label
                              htmlFor={`s-${currentConfiguringSlotIndex}-${student.id}`}
                              className="flex items-center cursor-pointer w-full"
                            >
                              <span className="mr-1.5 sm:mr-2 px-1.5 sm:px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-semibold rounded-full shrink-0">
                                {student.number}
                              </span>
                              <span className="text-gray-700 truncate">
                                {student.name}
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Caricamento configurazione slot...
                    </p>
                  )}
                </section>
              )}
          </div>

          {/* Colonna Destra: Esecuzione Estrazione e Elenco Studenti Classe */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            {/* ... (Esegui Estrazione section remains largely the same, ensure to pass `spinning` to disable elements) ... */}
            <section className="bg-white p-4 sm:p-6 rounded-xl shadow-xl text-center">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-4">
                Esegui Estrazione
              </h2>
              {students.length === 0 ? (
                <p className="text-gray-500 py-3">
                  Aggiungi studenti per estrarre.
                </p>
              ) : (
                <>
                  <div className="min-h-[10rem] w-full max-w-md mx-auto border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-4 text-center">
                    {spinning && (
                      <p className="text-sky-500 text-lg">Attendere...</p>
                    )}
                    {!spinning &&
                      selectedStudentsDisplay &&
                      selectedStudentsDisplay.length > 0 && (
                        <div>
                          <h3
                            className="text-lg font-semibold mb-2"
                            style={{ color: "darkgreen" }}
                          >
                            Studenti Estratti:
                          </h3>
                          {selectedStudentsDisplay.map((student, index) => (
                            <div
                              key={student.id}
                              className="my-1 p-2 border border-gray-200 bg-green-50 rounded"
                            >
                              <p className="text-md font-bold text-green-700">
                                {index + 1}. {student.name} (N. {student.number}
                                )
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    {!spinning &&
                      (!selectedStudentsDisplay ||
                        selectedStudentsDisplay.length === 0) && (
                        <p className="text-gray-500 text-sm">
                          Pronto per estrarre {numToSelect} student
                          {numToSelect === 1 ? "e" : "i"}?
                        </p>
                      )}
                  </div>

                  <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-3">
                    <button
                      onClick={handleRandomSelection}
                      disabled={
                        spinning ||
                        students.length === 0 ||
                        numToSelect <= 0 ||
                        eligibilityPerSlot.length !== numToSelect ||
                        eligibilityPerSlot.some(
                          (slot) => !slot || slot.size === 0
                        )
                      }
                      className="w-full sm:w-auto px-5 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-sky-500 to-cyan-400 text-white text-sm sm:text-base font-semibold rounded-lg shadow-lg hover:from-sky-600 hover:to-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                    >
                      {spinning
                        ? "Estrazione..."
                        : `Estrai ${numToSelect} ${
                            numToSelect === 1 ? "Studente" : "Studenti"
                          }`}
                    </button>
                    <button
                      onClick={handleClearExtractionResults}
                      className="w-full sm:w-auto px-4 py-2 text-xs bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-semibold rounded-md shadow-sm transition"
                    >
                      Pulisci Risultati
                    </button>
                  </div>
                  <button
                    onClick={handleShowDisplay}
                    className="block mx-auto mt-3 sm:mt-4 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-sky-600 border border-sky-500 rounded-md hover:bg-sky-50 transition"
                  >
                    Apri Pagina Visualizzazione &rarr;
                  </button>
                </>
              )}
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <section className="bg-white p-3 sm:p-4 rounded-xl shadow-xl">
                <h3 className="text-md sm:text-lg font-semibold text-gray-700 mb-3">
                  Elenco Studenti Classe ({students.length})
                </h3>
                {students.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 py-2">
                    Nessuno studente in questa classe.
                  </p>
                ) : (
                  <ul className="space-y-1.5 max-h-72 overflow-y-auto custom-scrollbar pr-1.5">
                    {students.map((student, index) => (
                      <li
                        key={student.id}
                        className="flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100 rounded-md group text-sm"
                      >
                        <div className="flex items-center truncate mr-2">
                          <span className="mr-2 px-2 py-0.5 bg-sky-100 text-sky-700 text-xs font-semibold rounded-full shrink-0">
                            {student.number}
                          </span>
                          {/* Ora il nome e l'etichetta sono un bottone unico */}
                          <button
                            onClick={() =>
                              handleToggleDSA(student.id, !!student.dsa)
                            }
                            title="Clicca per cambiare lo stato DSA"
                            className="flex items-center text-left"
                            disabled={spinning}
                          >
                            <span
                              className="text-gray-800 font-medium truncate"
                              title={student.name}
                            >
                              {student.name}
                            </span>
                            {student.dsa && (
                              <span className="ml-2 px-2 py-0.5 text-xs font-semibold text-orange-800 bg-orange-200 rounded-full">
                                DSA
                              </span>
                            )}
                          </button>
                        </div>
                        <div className="flex items-center space-x-0.5 shrink-0">
                          <button
                            onClick={() => handleMoveStudent(student.id, "up")}
                            disabled={index === 0 || spinning}
                            className={`p-1 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed ${
                              index === 0
                                ? "text-gray-400"
                                : "text-sky-600 hover:text-sky-700"
                            }`}
                            title="Sposta su"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="3"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 15l7-7 7 7"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() =>
                              handleMoveStudent(student.id, "down")
                            }
                            disabled={index === students.length - 1 || spinning}
                            className={`p-1 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed ${
                              index === students.length - 1
                                ? "text-gray-400"
                                : "text-sky-600 hover:text-sky-700"
                            }`}
                            title="Sposta giù"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="3"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteStudentFromClass(student.id)
                            }
                            disabled={spinning}
                            className="p-1 rounded-md text-red-500 hover:text-red-700 hover:bg-gray-200 disabled:opacity-50"
                            title="Elimina studente dalla classe"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 sm:h-5 sm:w-5" // Delete icon can be slightly larger
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
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section className="bg-white p-3 sm:p-4 rounded-xl shadow-xl">
                <h3 className="text-md sm:text-lg font-semibold text-gray-700 mb-3">
                  Aggiungi Studente alla Classe
                </h3>
                <form onSubmit={handleAddStudentToClass} className="space-y-3">
                  <div>
                    <label htmlFor="newStudentNameForClass" className="sr-only">
                      Nome studente
                    </label>
                    <input
                      id="newStudentNameForClass"
                      type="text"
                      value={newStudentNameForClass}
                      onChange={(e) =>
                        setNewStudentNameForClass(e.target.value)
                      }
                      placeholder="Es. Laura Bianchi"
                      required
                      disabled={spinning}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm disabled:bg-gray-50"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      id="newStudentIsDSA"
                      type="checkbox"
                      checked={newStudentIsDSA}
                      onChange={(e) => setNewStudentIsDSA(e.target.checked)}
                      disabled={spinning}
                      className="h-4 w-4 text-sky-600 border-gray-300 rounded focus:ring-sky-500"
                    />
                    <label
                      htmlFor="newStudentIsDSA"
                      className="ml-2 block text-sm text-gray-900"
                    >
                      Studente con DSA
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={spinning || !newStudentNameForClass.trim()}
                    className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-3 rounded-md shadow-sm transition text-sm disabled:opacity-70"
                  >
                    Aggiungi Studente
                  </button>
                </form>
              </section>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cdd5dd; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #b8c2cc; }
      `}</style>
    </div>
  );
};

export default Settings;
