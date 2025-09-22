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
   * Placeholder text when no value is selected
   */
  placeholder?: string;
  /**
   * Additional class names for the select trigger
   */
  className?: string;
}

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
}: ParentChapterSelectProps) {
  const selectValue = value ?? "none";

  const handleChange = (val: string) => {
    console.log('ParentChapterSelect - onChange:', { 
      oldValue: value, 
      newValue: val,
      parentChapters: parentChapters?.map(c => `${c.id}:${c.title}`) || []
    });
    
    // Convert "none" to null, otherwise ensure it's a string
    const newValue = val === "none" ? null : String(val);
    console.log('ParentChapterSelect - Processed value:', newValue);
    
    // Update the form
    onChange(newValue);
  };

  // Filter to only include top-level (level-0) chapters
  const sortedChapters = React.useMemo(() => {
    if (!Array.isArray(parentChapters)) {
      console.warn('ParentChapterSelect - parentChapters is not an array:', parentChapters);
      return [];
    }
    
    // Debug log the raw input
    console.log('ParentChapterSelect - Raw parentChapters:', parentChapters);
    
    try {
      // Filter for top-level chapters (level 0 or undefined)
      const topLevelChapters = parentChapters.filter(chapter => {
        const level = typeof chapter.level === 'number' ? chapter.level : 0;
        return level === 0; // Get top-level chapters (level 0)
      });
      
      // Sort by title
      const sorted = [...topLevelChapters].sort((a, b) => {
        return String(a.title).localeCompare(String(b.title));
      });
      
      console.log('ParentChapterSelect - Top level chapters:', sorted);
      return sorted;
    } catch (error) {
      console.error('ParentChapterSelect - Error processing chapters:', error);
      return [];
    }
  }, [parentChapters]);
  
  // Log when the component renders
  React.useEffect(() => {
    console.log('ParentChapterSelect - Component rendered with:', {
      props: { value, disabled, placeholder },
      selectValue,
      parentChaptersCount: parentChapters?.length || 0,
      sortedChaptersCount: sortedChapters.length
    });
  }, [value, disabled, placeholder, parentChapters, sortedChapters, selectValue]);

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
          sortedChapters.map((chapter) => {
            const chapterId = String(chapter.id);
            console.log(`Rendering chapter option:`, { 
              id: chapterId, 
              title: chapter.title,
              level: chapter.level,
              disabled: chapter.disabled,
              currentValue: selectValue
            });
            
            return (
              <SelectItem 
                key={chapterId}
                value={chapterId}
                disabled={chapter.disabled}
                className={cn(
                  chapter.disabled ? 'opacity-50 cursor-not-allowed' : '',
                  'whitespace-nowrap overflow-hidden text-ellipsis',
                  'flex items-center gap-2',
                  chapter.level === 0 ? 'font-medium' : '' // Only make top-level items bolder
                )}
              >
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
