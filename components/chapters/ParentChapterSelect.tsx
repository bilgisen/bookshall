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
    console.log('ParentChapterSelect - onChange - Raw value:', val);
    
    try {
      const newValue = val === "none" ? null : String(val);
      console.log('ParentChapterSelect - onChange - Processed value:', newValue);
      
      // Find the selected chapter for debugging
      if (newValue) {
        const selectedChapter = parentChapters?.find(c => String(c.id) === newValue);
        console.log('ParentChapterSelect - Selected chapter:', selectedChapter);
      }
      
      // Update the form
      onChange(newValue);
      
      console.log('ParentChapterSelect - onChange - Value updated successfully');
    } catch (error) {
      console.error('ParentChapterSelect - Error in handleChange:', error);
      // Fallback to null on error
      onChange(null);
    }
  };

  // Filter to only include top-level (level-0) chapters
  const sortedChapters = React.useMemo(() => {
    if (!Array.isArray(parentChapters)) {
      console.warn('ParentChapterSelect - parentChapters is not an array:', parentChapters);
      return [];
    }
    
    console.log('ParentChapterSelect - Raw parentChapters:', parentChapters);
    
    try {
      // Ensure we have valid chapters with titles and IDs
      const validChapters = parentChapters.filter(chapter => {
        return chapter && 
               chapter.id !== undefined && 
               chapter.id !== null && 
               chapter.title !== undefined && 
               chapter.title !== null;
      });
      
      console.log('ParentChapterSelect - Valid chapters:', validChapters);
      
      // Filter for top-level chapters (level 0 or undefined)
      const topLevelChapters = validChapters.filter(chapter => {
        const level = typeof chapter.level === 'number' ? chapter.level : 0;
        const isTopLevel = level === 0; // Get top-level chapters (level 0)
        console.log(`Chapter ${chapter.id} (${chapter.title}): level=${level}, isTopLevel=${isTopLevel}`);
        return isTopLevel;
      });
      
      // Sort by title
      const sorted = [...topLevelChapters].sort((a, b) => {
        const titleA = String(a.title || '').toLowerCase();
        const titleB = String(b.title || '').toLowerCase();
        return titleA.localeCompare(titleB);
      });
      
      console.log('ParentChapterSelect - Sorted top level chapters:', sorted);
      return sorted;
    } catch (error) {
      console.error('ParentChapterSelect - Error processing chapters:', error);
      return [];
    }
  }, [parentChapters]);
  
  // Log when the component renders or updates
  React.useEffect(() => {
    console.group('ParentChapterSelect - Render/Update');
    console.log('Current value:', value);
    console.log('Select value:', selectValue);
    console.log('Parent chapters count:', parentChapters?.length || 0);
    console.log('Sorted chapters count:', sortedChapters.length);
    console.log('Sorted chapters:', sortedChapters);
    console.groupEnd();
  }, [value, selectValue, parentChapters, sortedChapters]);

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
