import Image from 'next/image';

export const Logo = () => (
  <div className="flex items-center">
    <Image 
      src="/bookshall-w.svg" 
      alt="BooksHall Logo" 
      width={120} 
      height={32}
      className="h-4 w-auto"
      priority
    />
  </div>
);
