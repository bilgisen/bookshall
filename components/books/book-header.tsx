"use client";

import { Separator } from "@/components/ui/separator";

interface BookHeaderProps {
  title: string;
  description?: string;
  author?: string;
  className?: string;
  children?: React.ReactNode;
}

export function BookHeader({
  title,
  description,
  author,
  className = "",
  children,
}: BookHeaderProps) {
  return (
    <div className={`w-full space-y-4 ${className}`}>
      <div className="flex items-center justify-between w-full">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{title}</h1>
          {author && (
            <p className="text-muted-foreground text-sm">{author}</p>
          )}
          {description && (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{description}</p>
          )}
        </div>
        {children}
      </div>
      <Separator />
    </div>
  );
}