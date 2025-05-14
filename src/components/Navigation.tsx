// src/components/Navigation.tsx
import React from "react";
import { Link } from "react-router-dom";

const Navigation: React.FC = () => {
  return (
    <nav className="bg-gray-800 text-white p-4 shadow-md">
      <ul className="flex space-x-4 md:space-x-6 justify-center">
        <li>
          <Link
            to="/"
            className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Showing Page (Display)
          </Link>
        </li>
        <li>
          <Link
            to="/settings" // Assuming this is a path for settings, or adjust as needed
            className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Settings Page (Teacher)
          </Link>
        </li>
        {/* You might want a link to /classrooms if that's the teacher's main authenticated page */}
        <li>
          <Link
            to="/classrooms"
            className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
          >
            My Classrooms
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navigation;
