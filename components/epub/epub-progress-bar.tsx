// components/epub/epub-progress-bar.tsx
'use client';

import { motion } from 'framer-motion';

interface EpubProgressBarProps {
  progress: number;
}

export function EpubProgressBar({ progress }: EpubProgressBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-primary">Progress</span>
        <span className="text-primary">{Math.round(progress)}%</span>
      </div>
      
      <div className="h-3 w-full overflow-hidden rounded-full bg-primary/20">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Starting...</span>
        <span>Complete</span>
      </div>
    </div>
  );
}