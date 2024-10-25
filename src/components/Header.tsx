import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button"

const Header = () => {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-md">
      <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold tracking-tight">OCR Benchmarker</Link>
        <ul className="flex space-x-2">
          <li><Button variant="ghost" asChild><Link to="/">Bench</Link></Button></li>
          <li><Button variant="ghost" asChild><Link to="/results">Résultats</Link></Button></li>
          <li><Button variant="ghost" asChild><Link to="/kpi">KPI</Link></Button></li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;