// src/components/Navigation.tsx
import React from 'react';
import { Link } from 'react-router-dom';

const Navigation: React.FC = () => {
    return (
        <nav className="main-nav">
            <ul>
                <li><Link to="/">Showing Page</Link></li>
                <li><Link to="/settings">Settings Page</Link></li>
            </ul>
        </nav>
    );
};

export default Navigation;