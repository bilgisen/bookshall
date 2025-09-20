"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ChapterOption {
  id: string | number;
  title: string;
  level?: number;
  disabled?: boolean;
}

export interface ParentChapterSelectProps {
  /**
   * Array of chapter options to display in the select
   */
  parentChapters: ChapterOption[];
  /**
   * Currently selected chapter ID or null for "No parent"
   */
  value: string | null | undefined;
  /**
   * Callback when selected chapter changes
   * @param value The selected chapter ID or null for "No parent"
   */
  onChange: (value: string | null) => void;
  /**
   * Whether the select is disabled
   */
  disabled?: boolean;
  /**
   * Additional class names for the select trigger
   */
  className?: string;
  /**
   * Placeholder text when no value is selected
   */
  placeholder?: string;
  /**
   * Whether to show the level indicator for chapters
   */
  showLevelIndicator?: boolean;
}

const getLevelIndicator = (level: number = 0) => {
  return '— '.repeat(level) + ' ';
};

/**
 * A select component for choosing a parent chapter with support for hierarchical display
 */
function ParentChapterSelect({
  parentChapters,
  value,
  onChange,
  disabled = false,
  className,
  placeholder = "Select parent chapter",
  showLevelIndicator = true,
}: ParentChapterSelectProps) {
  const selectValue = value ?? "none";

  const handleChange = (val: string) => {
    console.log('ParentChapterSelect - onChange:', { 
      oldValue: value, 
      newValue: val,
      parentChapters: parentChapters.map(c => `${c.id}:${c.title}`)
    });
    // Always ensure we're returning null for "none" or a string ID
    onChange(val === "none" ? null : String(val));
  };

  // Sort chapters by level and then by title
  const sortedChapters = React.useMemo(() => {
    if (!Array.isArray(parentChapters)) {
      console.warn('ParentChapterSelect - parentChapters is not an array:', parentChapters);
      return [];
    }
    
    // Log the raw input for debugging
    console.log('ParentChapterSelect - Raw parentChapters:', parentChapters);
    
    try {
      const sorted = [...parentChapters].sort((a, b) => {
        const levelA = typeof a.level === 'number' ? a.level : 0;
        const levelB = typeof b.level === 'number' ? b.level : 0;
        
        if (levelA !== levelB) return levelA - levelB;
        return String(a.title).localeCompare(String(b.title));
      });
      
      console.log('ParentChapterSelect - Sorted chapters:', sorted);
      return sorted;
    } catch (error) {
      console.error('ParentChapterSelect - Error sorting chapters:', error);
      return [];
    }
  }, [parentChapters]);
  
  // Log when the component renders
  React.useEffect(() => {
    console.log('ParentChapterSelect - Component rendered with:', {
      props: { value, disabled, placeholder, showLevelIndicator },
      selectValue,
      parentChaptersCount: parentChapters?.length || 0,
      sortedChaptersCount: sortedChapters.length
    });
  }, [value, disabled, placeholder, showLevelIndicator, parentChapters, sortedChapters, selectValue]);

  return (
    <Select 
      value={selectValue} 
      onValueChange={handleChange} 
      disabled={disabled}
    >
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none" className="font-medium">
          No parent (Top level chapter)
        </SelectItem>
        {sortedChapters.length > 0 ? (
          sortedChapters.map((chapter, index) => {
            const chapterId = String(chapter.id);
            console.log(`Rendering chapter ${index}:`, { id: chapterId, title: chapter.title, level: chapter.level });
            
            return (
              <SelectItem 
                key={chapterId}
                value={chapterId}
                disabled={chapter.disabled}
                className={cn(
                  chapter.disabled ? 'opacity-50 cursor-not-allowed' : '',
                  'whitespace-nowrap overflow-hidden text-ellipsis',
                  'flex items-center gap-2'
                )}
              >
                {showLevelIndicator && getLevelIndicator(chapter.level)}
                <span className="truncate">{chapter.title}</span>
              </SelectItem>
            );
          })
        ) : (
          <div 
            className="px-3 py-2 text-sm text-muted-foreground"
            onClick={(e) => {
              e.preventDefault();
              console.log('No chapters available. Parent chapters data:', parentChapters);
            }}
          >
            {parentChapters?.length === 0 ? 'No chapters available' : 'Loading chapters...'}
          </div>
        )}
      </SelectContent>
    </Select>
  );
}

export { ParentChapterSelect as default }
