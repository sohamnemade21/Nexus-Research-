import React from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ theme, toggleTheme }) {
  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500"
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-amber-400 transition-transform duration-200 hover:rotate-45" />
      ) : (
        <Moon className="w-5 h-5 text-slate-700 transition-transform duration-200 hover:-rotate-12" />
      )}
    </button>
  );
}
