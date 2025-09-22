'use client';

// 1. Gereksiz ve sorun yaratan import'ları kaldırın
// import React, { useMemo, useCallback, ComponentProps } from 'react'; 
import React, { useMemo, useCallback } from 'react'; 
// 2. NodeApi import'unu kaldırın (kullanılmıyor)
// import { Tree, NodeRendererProps, NodeApi } from 'react-arborist'; 
import { Tree, NodeRendererProps, MoveHandler } from 'react-arborist'; // MoveHandler'ı doğrudan import edin
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { GripVertical, Eye, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// Define the chapter structure based on your API response
interface Chapter {
  id: string;
  title: string;
  name?: string; // Added for tree compatibility
  order: number;
  parentChapterId: string | null;
  children?: Chapter[]; // This is used by react-arborist directly
  isDraft?: boolean;
  level?: number;
  wordCount?: number;
  readingTime?: number | null;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
  excerpt?: string | null;
  content?: unknown;
  bookId?: string;
  isOpen?: boolean; // This is used by react-arborist to track open/closed state
  // isLeaf is not needed as react-arborist determines this based on children
}

interface ChapterTreeArboristProps {
  bookSlug: string;
  onSelectChapter?: (chapter: Chapter) => void;
  onViewChapter?: (chapter: Chapter) => void;
  onEditChapter?: (chapter: Chapter) => void;
  onDeleteChapter?: (chapter: Chapter) => void;
  selectedChapterId?: string | null;
}

export function ChapterTreeArborist({ 
  bookSlug, 
  onSelectChapter, 
  onViewChapter, 
  onEditChapter, 
  onDeleteChapter, 
  selectedChapterId 
}: ChapterTreeArboristProps) {
  const { data, isLoading, error, refetch } = useQuery<{
    flat: Chapter[];
    tree: Chapter[];
  }>({
    queryKey: ['chapters', bookSlug],
    queryFn: async () => {
      const response = await fetch(`/api/books/by-slug/${bookSlug}/chapters`, {
        credentials: 'include'
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching chapters:', errorText);
        throw new Error('Failed to fetch chapters');
      }
      return response.json();
    }
  });

  // Transform the tree data for react-arborist
  const treeData = useMemo(() => {
    if (!data?.tree) return [];
    
    // Ensure isOpen is set correctly for react-arborist
    const transformChapters = (chapters: Chapter[]): Chapter[] => {
      return chapters.map(chapter => ({
        ...chapter,
        name: chapter.title || 'Untitled Chapter',
        // isOpen: true, // Let react-arborist manage this or set initial state if needed
        // isLeaf is determined by react-arborist based on children array
        children: chapter.children ? transformChapters(chapter.children) : [] // Recursively transform children
      }));
    };
    
    // Sort root level chapters by order
    const sortedChapters = [...(data.tree || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
    return transformChapters(sortedChapters);
  }, [data]);

  // 3. handleMove fonksiyonunun args parametresine açık tip tanımı ekliyoruz.
  //    MoveHandler<Chapter> tipinden parametre tipini çıkarıyoruz.
  const handleMove = useCallback(async (args: Parameters<MoveHandler<Chapter>>[0]) => {
    // args artık doğru şekilde tiplenmiş olacak.
    try {
      const { dragIds, parentId, index, parentNode } = args;
      const chapterId = dragIds[0];
      
      if (!data?.tree) return;
      
      // Find the chapter being moved in the current tree
      const findChapterInTree = (chapters: Chapter[], id: string): Chapter | null => {
        for (const chapter of chapters) {
          if (chapter.id === id) return chapter;
          if (chapter.children?.length) {
            const found = findChapterInTree(chapter.children, id);
            if (found) return found;
          }
        }
        return null;
      };
      
      const movedChapter = findChapterInTree(data.tree, chapterId);
      if (!movedChapter) {
        console.error('Chapter not found in the current tree');
        toast.error('Bölüm bulunamadı.');
        return;
      }
      
      // --- Depth Control Logic ---
      // Check if the new parent would exceed the maximum depth (e.g., 2 levels: 0 and 1)
      const MAX_DEPTH = 1; // 0-based index: Level 0 (root), Level 1 (children of root)
      
      // Determine the potential new level for the moved chapter
      let newLevel: number;
      if (parentId === null || parentId === 'root') {
        // Moving to root level
        newLevel = 0; 
      } else {
        // Find the new parent node in the *current* tree structure (before the move)
        const newParentNode = parentNode; // parentNode is the target parent node provided by react-arborist
        if (!newParentNode) {
             console.error('New parent node not found');
             toast.error('Geçersiz hedef.');
             return;
        }
        // Calculate the new level based on the parent's level
        newLevel = (newParentNode.level ?? -1) + 1; 
      }

      // Check if the new level exceeds the maximum allowed depth
      if (newLevel > MAX_DEPTH) {
        toast.error('Maximum derinliğe ulaşıldı. 2 seviyeden daha derine yerleştirilemez.');
        // Do not proceed with the move
        return; 
      }
      // --- End Depth Control Logic ---

      // Determine the new parent ID for the API call
      const newParentId = parentId === 'root' || !parentId ? null : parentId;
      
      // Prepare the update data
      const updateData = {
        order: index,
        // level: newLevel, // Send the calculated new level if your API expects it
        parentChapterId: newParentId
      };
      
      console.log('Updating chapter:', { chapterId, updateData });
      
      // Send the update to the API
      const response = await fetch(`/api/books/by-slug/${bookSlug}/chapters/${chapterId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`Failed to update chapter order: ${errorText}`);
      }
      
      // Get the updated chapter data (optional, depending on API response)
      // const updatedChapter = await response.json(); 
      // console.log('Chapter updated successfully:', updatedChapter);
      
      // Force a re-render with the updated data
      await refetch();
      
      // Show success feedback
      toast.success('Chapter order updated');
    } catch (error) {
      console.error('Error moving chapter:', error);
      toast.error('Bölüm taşınırken bir hata oluştu.');
      // Optionally, you might want to refetch data here to revert the UI if the API call failed
      // await refetch(); 
    }
  }, [bookSlug, refetch, data]);

  // 4. onMove handler'ının tipini doğrudan MoveHandler<Chapter> olarak tanımlıyoruz.
  const onMove: MoveHandler<Chapter> = useCallback((args) => { 
    // args zaten doğru tipte
    return handleMove(args); 
    // Return type Promise<void> from handleMove is compatible with MoveHandler
    // Previously returning `true` was incorrect for the MoveHandler type
  }, [handleMove]);

  const ChapterNode = ({ node, style, dragHandle }: NodeRendererProps<Chapter>) => {
    const chapter = node.data;
    const isSelected = selectedChapterId === chapter.id;
    
    return (
      <div 
        ref={dragHandle}
        style={style}
        className={`flex items-center px-2 py-1 hover:bg-card ${isSelected ? 'bg-accent' : ''} rounded transition-colors`}
        onClick={() => onSelectChapter?.(chapter)}
      >
        <div className="flex items-center flex-1 min-w-0"> {/* Added min-w-0 for truncation */}
          <GripVertical className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
          <span className="truncate">{chapter.name || chapter.title}</span>
          {chapter.isDraft && (
            <span className="ml-2 text-xs text-gray-500 whitespace-nowrap">(Draft)</span>
          )}
        </div>
        <div className="flex space-x-1 flex-shrink-0">
          {onViewChapter && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              asChild
            >
              <Link href={`/dashboard/books/${bookSlug}/chapters/${chapter.id}/view`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
          )}
          {onEditChapter && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                // Ensure title is present and avoid circular refs if passing data elsewhere
                const chapterToEdit = {
                  ...chapter,
                  title: chapter.name || chapter.title,
                  children: undefined // Remove children to avoid circular references if needed by caller
                };
                onEditChapter(chapterToEdit);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDeleteChapter && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-red-500 hover:text-red-600"
              onClick={async (e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this chapter?')) {
                  // Ensure title is present and avoid circular refs if passing data elsewhere
                   const chapterToDelete = {
                      ...chapter,
                      title: chapter.name || chapter.title,
                      children: undefined // Remove children to avoid circular references if needed by caller
                   };
                  await onDeleteChapter(chapterToDelete);
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    );
  };


  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">Error loading chapters. Please try again.</div>;
  }

  return (
    <div className="h-full">
      <div className="flex-1 overflow-auto">
        {/* Removed getChildren prop as it's not a standard prop for react-arborist Tree */}
        {/* Controlled the depth by modifying the data structure and checking in onMove/handleMove */}
        <Tree<Chapter>
          data={treeData}
          openByDefault={false}
          width="100%"
          height={500}
          indent={24}
          rowHeight={32}
          paddingTop={30}
          paddingBottom={10}
          onMove={onMove} // Use the correctly typed onMove handler
          // getChildren={getChildren} // Removed this line
        >
          {ChapterNode}
        </Tree>
      </div>
    </div>
  );
}