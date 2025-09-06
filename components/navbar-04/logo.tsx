"use client";

import { Library } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";

export function Logo() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  return (
    <Link href="/" className="flex items-center space-x-2 ml-4">
      <Library 
        className={`h-6 w-6 ${isDark ? 'text-white' : 'text-foreground'}`} 
        aria-hidden="true"
      />
      <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-foreground'}`}>
        BooksHall
      </span>
    </Link>
  );
}

export default Logo;
