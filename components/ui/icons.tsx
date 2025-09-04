import * as React from 'react';
import { LucideProps } from 'lucide-react';

const createIcon = (Icon: React.ComponentType<LucideProps>) => {
  return function IconComponent({ className, ...props }: LucideProps) {
    return <Icon className={className} {...props} />;
  };
};

// Basic Icons
export const Bold = createIcon(require('lucide-react').Bold);
export const Italic = createIcon(require('lucide-react').Italic);
export const Underline = createIcon(require('lucide-react').Underline);
export const Strikethrough = createIcon(require('lucide-react').Strikethrough);
export const Code = createIcon(require('lucide-react').Code);
export const Link = createIcon(require('lucide-react').Link);
export const List = createIcon(require('lucide-react').List);
export const ListOrdered = createIcon(require('lucide-react').ListOrdered);
export const Quote = createIcon(require('lucide-react').Quote);

// Block Icons
export const H1 = createIcon(require('lucide-react').Heading1);
export const H2 = createIcon(require('lucide-react').Heading2);
export const H3 = createIcon(require('lucide-react').Heading3);

// UI Icons
export const Check = createIcon(require('lucide-react').Check);
export const ChevronDown = createIcon(require('lucide-react').ChevronDown);
export const ChevronRight = createIcon(require('lucide-react').ChevronRight);
export const Plus = createIcon(require('lucide-react').Plus);
export const X = createIcon(require('lucide-react').X);

// AI Icons
export const Sparkles = createIcon(require('lucide-react').Sparkles);
export const Wand2 = createIcon(require('lucide-react').Wand2);

// Editor Icons
export const AlignCenter = createIcon(require('lucide-react').AlignCenter);
export const AlignJustify = createIcon(require('lucide-react').AlignJustify);
export const AlignLeft = createIcon(require('lucide-react').AlignLeft);
export const AlignRight = createIcon(require('lucide-react').AlignRight);
export const BoldIcon = createIcon(require('lucide-react').Bold);
export const Code2 = createIcon(require('lucide-react').Code2);
export const FileText = createIcon(require('lucide-react').FileText);
export const Heading1 = createIcon(require('lucide-react').Heading1);
export const Heading2 = createIcon(require('lucide-react').Heading2);
export const Heading3 = createIcon(require('lucide-react').Heading3);
export const Image = createIcon(require('lucide-react').Image);
export const ItalicIcon = createIcon(require('lucide-react').Italic);
export const ListIcon = createIcon(require('lucide-react').List);
export const ListOrderedIcon = createIcon(require('lucide-react').ListOrdered);
export const Minus = createIcon(require('lucide-react').Minus);
export const Minus2 = createIcon(require('lucide-react').Minus);
export const MoreHorizontal = createIcon(require('lucide-react').MoreHorizontal);
export const PanelLeft = createIcon(require('lucide-react').PanelLeft);
export const PanelRight = createIcon(require('lucide-react').PanelRight);
export const Pilcrow = createIcon(require('lucide-react').Pilcrow);
export const QuoteIcon = createIcon(require('lucide-react').Quote);
export const Redo2 = createIcon(require('lucide-react').Redo2);
export const Slash = createIcon(require('lucide-react').Slash);
export const StrikethroughIcon = createIcon(require('lucide-react').Strikethrough);
export const Table = createIcon(require('lucide-react').Table);
export const UnderlineIcon = createIcon(require('lucide-react').Underline);
export const Undo2 = createIcon(require('lucide-react').Undo2);

// Status Icons
export const Loader = createIcon(require('lucide-react').Loader2);
export const CheckCircle = createIcon(require('lucide-react').CheckCircle2);
export const XCircle = createIcon(require('lucide-react').XCircle);
export const AlertCircle = createIcon(require('lucide-react').AlertCircle);

// Navigation Icons
export const Menu = createIcon(require('lucide-react').Menu);
export const Close = createIcon(require('lucide-react').X);
export const ChevronLeft = createIcon(require('lucide-react').ChevronLeft);
export const ChevronUp = createIcon(require('lucide-react').ChevronUp);
export const ChevronRightIcon = createIcon(require('lucide-react').ChevronRight);

// File Icons
export const File = createIcon(require('lucide-react').File);
export const FileTextIcon = createIcon(require('lucide-react').FileText);

// Action Icons
export const Copy = createIcon(require('lucide-react').Copy);
export const Download = createIcon(require('lucide-react').Download);
export const Edit = createIcon(require('lucide-react').Edit);
export const Trash2 = createIcon(require('lucide-react').Trash2);

// Media Icons
export const ImageIcon = createIcon(require('lucide-react').Image);
export const Video = createIcon(require('lucide-react').Video);

// Utility Icons
export const Search = createIcon(require('lucide-react').Search);
export const Settings = createIcon(require('lucide-react').Settings);
export const User = createIcon(require('lucide-react').User);
export const LogOut = createIcon(require('lucide-react').LogOut);

// AI Icons
export const Bot = createIcon(require('lucide-react').Bot);
export const Brain = createIcon(require('lucide-react').Brain);

// Custom Icons
export const Logo = (props: LucideProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
    {...props}
  >
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
  </svg>
);
