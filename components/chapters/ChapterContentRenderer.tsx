// components/chapters/ChapterContentRenderer.tsx
import { JSONContent } from '@tiptap/react';
import { Document } from '@tiptap/extension-document';
import { Text } from '@tiptap/extension-text';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Heading } from '@tiptap/extension-heading';
import { Bold } from '@tiptap/extension-bold';
import { Italic } from '@tiptap/extension-italic';
import { ListItem } from '@tiptap/extension-list-item';
import { BulletList } from '@tiptap/extension-bullet-list';
import { OrderedList } from '@tiptap/extension-ordered-list';
import { Link } from '@tiptap/extension-link';
import { useEffect, useState } from 'react';

// Configure Tiptap extensions for rendering
const tiptapExtensions = [
  Document,
  Text,
  Paragraph,
  Heading.configure({
    levels: [1, 2, 3, 4, 5, 6],
  }),
  Bold,
  Italic,
  ListItem,
  BulletList,
  OrderedList,
  Link.configure({
    openOnClick: false,
  }),
];

interface ChapterContentRendererProps {
  content: string | JSONContent | null;
  className?: string;
}

export function ChapterContentRenderer({ content, className = '' }: ChapterContentRendererProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!content) {
    return <p className="text-muted-foreground">No content available</p>;
  }

  // Handle string content (could be HTML, JSON string, or plain text)
  if (typeof content === 'string') {
    const trimmedContent = content.trim();
    
    // Check if it's a JSON string that needs to be parsed
    if ((trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) || 
        (trimmedContent.startsWith('[') && trimmedContent.endsWith(']'))) {
      try {
        const parsedContent = JSON.parse(trimmedContent);
        return <RenderContentObject content={parsedContent} className={className} />;
      } catch (e) {
        console.warn('Content looks like JSON but could not be parsed:', e);
        // Continue to handle as HTML or plain text
      }
    }
    
    // Check if it's HTML content
    const isHtml = /<[a-z][\s\S]*>/i.test(trimmedContent) || 
                  trimmedContent.startsWith('<') || 
                  trimmedContent.includes('</');
    
    if (isHtml) {
      // Clean up the HTML content for security
      const cleanedContent = trimmedContent
        // Remove any script tags and their content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove any iframe tags and their content
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        // Remove any form elements
        .replace(/<form[^>]*>.*?<\/form>/gis, '')
        // Remove any potentially dangerous attributes
        .replace(/\s+(on\w+|style|formaction|autofocus|autoplay|controls|download|hidden|loop|muted|open|required|sandbox|scoped|seamless|async|defer|nomodule|target|formtarget)\s*=\s*(["'])(?:\\[\s\S]|(?!\2).)*\2/gi, '')
        // Remove any event handlers
        .replace(/\s+on\w+\s*=\s*(["'])(?:[^"']|\\["'])*\1/gi, '')
        // Remove empty paragraphs
        .replace(/<p>\s*<\/p>/g, '')
        // Ensure proper semantic structure
        .replace(/<p(\s+[^>]*)?>/gi, '<p class="prose-p"$1>')
        .replace(/<h([1-6])(\s+[^>]*)?>/gi, '<h$1 class="prose-h$1"$2>')
        .replace(/<ul(\s+[^>]*)?>/gi, '<ul class="prose-ul"$1>')
        .replace(/<ol(\s+[^>]*)?>/gi, '<ol class="prose-ol"$1>')
        .replace(/<li(\s+[^>]*)?>/gi, '<li class="prose-li"$1>')
        .replace(/<a(\s+[^>]*)?>/gi, (match) => {
          // Ensure external links open in new tab and add security attributes
          const href = match.match(/href\s*=\s*["']([^"']*)["']/i);
          if (href && (href[1].startsWith('http://') || href[1].startsWith('https://'))) {
            return match.replace('>', ' rel="noopener noreferrer" target="_blank">');
          }
          return match;
        });
      
      // Only use dangerouslySetInnerHTML on the client side
      if (isClient) {
        return (
          <div 
            className={`prose dark:prose-invert max-w-none ${className}`}
            dangerouslySetInnerHTML={{ 
              __html: `
                <div class="prose dark:prose-invert max-w-none break-words">
                  ${cleanedContent}
                </div>
              `
            }}
            suppressHydrationWarning={true}
          />
        );
      }
      return <div className={`prose dark:prose-invert max-w-none ${className}`} />;
    }
    
    // If not HTML, treat as plain text
    return (
      <div className={`prose dark:prose-invert max-w-none ${className}`}>
        <p className="whitespace-pre-wrap">{trimmedContent}</p>
      </div>
    );
  }
  
  // Handle JSON content
  if (typeof content === 'object' && content !== null) {
    // If it's a Tiptap JSON content object with a 'type' property
    if ('type' in content) {
      try {
        return <RenderContentObject content={content} className={className} />;
      } catch (error) {
        console.error('Error parsing JSON content:', error);
        const contentString = JSON.stringify(content, null, 2);
        return (
          <div className={`prose dark:prose-invert max-w-none ${className}`}>
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
              <p className="text-yellow-700 dark:text-yellow-400 font-medium">
                Could not parse content as JSON
              </p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                Showing raw content instead.
              </p>
              <pre className="mt-2 p-2 bg-white dark:bg-gray-800 rounded text-xs overflow-auto max-h-60 whitespace-pre-wrap break-words">
                {contentString.length > 1000 ? contentString.substring(0, 1000) + '...' : contentString}
              </pre>
            </div>
          </div>
        );
      }
    }
    
    // Fallback for unexpected object content
    return (
      <div className={`prose dark:prose-invert max-w-none ${className}`}>
        <p className="text-muted-foreground">Unsupported content format</p>
      </div>
    );
  }
  
  // This should never be reached due to TypeScript type checking
  return <div className={`prose dark:prose-invert max-w-none ${className}`}>
    <p className="text-muted-foreground">Unable to render content</p>
  </div>;
}

// Helper component to render JSON content
function RenderContentObject({ 
  content, 
  className = '' 
}: { 
  content: JSONContent | string | null;
  className?: string;
}): React.ReactElement {
  const [html, setHtml] = useState<string>('');
  const [error, setError] = useState<Error | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    const renderContent = async () => {
      if (!content) return;
      
      // Handle string content
      if (typeof content === 'string') {
        setHtml(content);
        return;
      }

      // Handle JSON content
      try {
        // Dynamically import generateHTML to avoid SSR issues
        const { generateHTML } = await import('@tiptap/html');
        const generatedHtml = generateHTML(content, tiptapExtensions);
        setHtml(generatedHtml);
      } catch (err) {
        console.error('Error generating HTML:', err);
        setError(err instanceof Error ? err : new Error('Failed to render content'));
      }
    };

    if (isClient) {
      renderContent();
    }
  }, [content, isClient]);

  if (error) {
    return (
      <div className={`prose dark:prose-invert max-w-none ${className}`}>
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
          <p className="text-red-600 dark:text-red-400 font-medium">
            Error rendering content
          </p>
          <p className="text-sm text-red-500 dark:text-red-400 mt-1">
            {error.message}
          </p>
        </div>
      </div>
    );
  }

  if (!isClient || !html) {
    return <div className={`prose dark:prose-invert max-w-none ${className}`} />;
  }

  return (
    <div 
      className={`prose dark:prose-invert max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }} 
    />
  );
}
