import { Library } from 'lucide-react';

export const Logo = () => (
  <div className="flex items-center space-x-2">
    <Library className="h-6 w-6 ml-2 text-foreground" />
    <span className="text-lg font-bold text-foreground">BooksHall</span>
  </div>
);
