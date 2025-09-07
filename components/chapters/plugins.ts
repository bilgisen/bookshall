import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Link } from '@tiptap/extension-link';
import { Placeholder } from '@tiptap/extension-placeholder';

// Only use extensions that are already installed
export const plugins = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3, 4, 5, 6],
    },
    bulletList: {
      HTMLAttributes: {
        class: 'list-disc pl-4',
      },
    },
    orderedList: {
      HTMLAttributes: {
        class: 'list-decimal pl-4',
      },
    },
  }),
  Underline,
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: 'text-blue-500 underline hover:text-blue-700',
    },
  }),
  Placeholder.configure({
    placeholder: 'Start writing here...',
  }),
];

// Custom AI Editor extension
const AIEditor = Extension.create({
  name: 'aiEditor',
  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () => {
        // Handle AI completion
        return true;
      },
    };
  },
});

export { AIEditor };
