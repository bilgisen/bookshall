// components/ui/shadcn-io/minimal-tiptap/index.tsx
'use client';

import * as React from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Toggle } from '@/components/ui/toggle';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Link } from '@tiptap/extension-link';
import { Table as TableIcon, Link as LinkIcon, Unlink as UnlinkIcon } from 'lucide-react';

import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo,
  Redo,
  Image as ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MinimalTiptapProps {
  content?: string | object | null;
  onChange?: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  onImageUpload?: (file: File) => Promise<string>;
}

function MinimalTiptap({
  content = '',
  onChange,
  placeholder = 'Start typing...',
  editable = true,
  className,
  onImageUpload,
}: MinimalTiptapProps) {
  const [isMounted, setIsMounted] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  React.useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const addImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor) return;

    try {
      // Create a temporary URL for the image preview
      const tempImageUrl = URL.createObjectURL(file);
      
      // Insert a temporary image with loading state (use blob URL as a key)
      const imageNode = {
        type: 'image',
        attrs: {
          src: tempImageUrl,
          alt: 'Uploading...',
          title: 'Uploading...',
          class: 'opacity-50 transition-opacity duration-300'
        }
      };
      
      // Insert the temporary image
      editor.chain().focus().insertContent(imageNode).run();
      
      // If onImageUpload is provided, use it to upload the image
      if (onImageUpload) {
        try {
          const imageUrl = await onImageUpload(file);
          
          // Find and update the image node with the final URL by matching the temporary src
          editor.commands.command(({ tr }) => {
            tr.doc.descendants((node, pos) => {
              if (node.type.name === 'image' && node.attrs.src === tempImageUrl) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  src: imageUrl,
                  alt: file.name,
                  title: file.name,
                  class: 'opacity-100'
                });
                return false; // Stop traversal
              }
              return true;
            });
            return true;
          });
          
        } catch (error) {
          console.error('Error uploading image:', error);
          
          // Update the image to show error state
          editor.commands.command(({ tr }) => {
            tr.doc.descendants((node, pos) => {
              if (node.type.name === 'image' && node.attrs.src === tempImageUrl) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  src: '',
                  alt: 'Upload failed',
                  title: 'Upload failed',
                  class: 'border-2 border-red-500'
                });
                return false;
              }
              return true;
            });
            return true;
          });
          
          throw error;
        }
      } else {
        // If no onImageUpload is provided, just use the object URL
        editor.commands.command(({ tr }) => {
          tr.doc.descendants((node, pos) => {
            if (node.type.name === 'image' && node.attrs.src === tempImageUrl) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                alt: file.name,
                title: file.name,
                class: 'opacity-100'
              });
              return false;
            }
            return true;
          });
          return true;
        });
      }
    } finally {
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Normalize content prop into what TipTap expects
  const normalizeForEditor = React.useCallback((c: string | object | null) => {
    if (!c) return '';
    if (typeof c === 'object') return c;
    const trimmed = c.trim();
    // JSON string → object
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        // fallthrough to HTML/text handling
      }
    }
    // HTML string or plain text; TipTap can take HTML string
    return trimmed;
  }, []);

  const editor = useEditor({
    content: isMounted ? normalizeForEditor(content) : '',
    extensions: [
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto my-4',
        },
        allowBase64: true,
      }),
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
          HTMLAttributes: {
            class: 'prose-h1 sm:prose-h2 lg:prose-h3 mt-4 mb-2'
          }
        },
        paragraph: {
          HTMLAttributes: {
            class: 'prose-p my-2'
          }
        },
        bulletList: {
          HTMLAttributes: {
            class: 'prose-ul list-disc pl-6 my-2'
          }
        },
        orderedList: {
          HTMLAttributes: {
            class: 'prose-ol list-decimal pl-6 my-2'
          }
        },
        listItem: {
          HTMLAttributes: {
            class: 'prose-li my-1'
          }
        },
        blockquote: {
          HTMLAttributes: {
            class: 'prose-blockquote border-l-4 border-gray-300 pl-4 my-2 italic'
          }
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'prose-code bg-gray-100 dark:bg-gray-800 p-1 rounded'
          }
        }
      }),
      Placeholder.configure({
        placeholder
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800',
        },
      }),
    ],
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl',
          'focus:outline-none min-h-[200px] p-4',
          'dark:prose-invert',
          className
        ),
      },
    },
    parseOptions: {
      preserveWhitespace: 'full',
    },
  });

  const setLink = React.useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href;
    const url = window.prompt('URL', prev || 'https://');

    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  // Update content when the content prop changes
  React.useEffect(() => {
    if (!editor) return;
    
    try {
      // Don't update if content is the same
      const currentContent = editor.getHTML();
      const contentString = typeof content === 'string' ? content : JSON.stringify(content || '');
      
      if (currentContent === contentString) return;
      
      // If content is empty, clear the editor
      if (!content) {
        editor.commands.clearContent();
        return;
      }
      
      // Handle JSON string
      if (typeof content === 'string') {
        const trimmed = content.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          try {
            const parsed = JSON.parse(trimmed);
            editor.commands.setContent(parsed);
            return;
          } catch {
            // fallthrough to HTML/text
          }
        }
        // Handle HTML string
        if (trimmed.startsWith('<') || trimmed.includes('<')) {
          editor.commands.setContent(trimmed);
        } else {
          // Plain text
          editor.commands.setContent(`<p>${trimmed}</p>`);
        }
      } else if (content) {
        // JSON object
        editor.commands.setContent(content);
      }
    } catch (error) {
      console.error('[MinimalTiptap] Error setting content:', error);
      editor.commands.setContent('<p>Error loading content</p>');
    }
  }, [editor, content, isMounted]);

  React.useEffect(() => {
    return () => editor?.destroy();
  }, [editor]);

  if (!editor) {
    return (
      <div className={cn('border rounded-lg bg-card overflow-hidden', className)}>
        <div className="prose prose-sm bg-card sm:prose-base lg:prose-lg xl:prose-2xl mx-auto min-h-[500px] p-24">
          {placeholder}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('border rounded-lg', className)}>
      <div
        className={cn(
          // sticky toolbar
          'sticky top-16 z-30 border-b p-2 flex flex-wrap items-center gap-1',
          // visual
          'bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/60'
        )}
      >
        <Toggle
          size="sm"
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('strike')}
          onPressedChange={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('code')}
          onPressedChange={() => editor.chain().focus().toggleCode().run()}
          disabled={!editor.can().chain().focus().toggleCode().run()}
        >
          <Code className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-6" />

        <Toggle
          size="sm"
          onPressedChange={addImage}
        >
          <ImageIcon className="h-4 w-4" />
        </Toggle>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
          multiple={false}
        />

        <Separator orientation="vertical" className="h-6" />

        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 1 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 2 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 3 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-6" />

        <Toggle
          size="sm"
          pressed={editor.isActive('bulletList')}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('orderedList')}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('blockquote')}
          onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-6" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true })}
        >
          <TableIcon className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <Button
          variant="ghost"
          size="sm"
          onClick={setLink}
          disabled={!editor?.isEditable}
          className={editor?.isActive('link') ? 'bg-accent' : ''}
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor?.chain().focus().unsetLink().run()}
          disabled={!editor?.isActive('link') || !editor?.isEditable}
        >
          <UnlinkIcon className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <Toggle
          size="sm"
          onPressedChange={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-6" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      <div className="py-4 px-12"><EditorContent editor={editor} /></div>
    </div>
  );
}

export { MinimalTiptap, type MinimalTiptapProps };
