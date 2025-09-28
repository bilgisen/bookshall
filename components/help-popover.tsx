"use client";

import * as React from "react";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type LanguageCode = 'en' | 'tr' | 'de' | 'es' | 'fr';

interface HelpContent {
  title: string;
  content: string;
}

interface HelpPopoverProps {
  content: Record<LanguageCode, HelpContent>;
  className?: string;
  buttonClassName?: string;
  iconSize?: number;
}

export function HelpPopover({ 
  content, 
  className = "",
  buttonClassName = "",
  iconSize = 16
}: HelpPopoverProps) {
  const [activeTab, setActiveTab] = React.useState<LanguageCode>('en');
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button 
          className={`inline-flex items-center justify-center rounded-full p-1.5 hover:bg-accent hover:text-accent-foreground transition-colors ${buttonClassName}`}
          aria-label="Help"
        >
          <Info className="h-4 w-4" style={{ width: iconSize, height: iconSize }} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">{content[activeTab].title}</h3>
            <div className="flex space-x-1">
              {Object.keys(content).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setActiveTab(lang as LanguageCode)}
                  className={`text-xs px-2 py-1 rounded ${
                    activeTab === lang 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-accent'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="text-sm text-muted-foreground whitespace-pre-line">
            {content[activeTab].content}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
