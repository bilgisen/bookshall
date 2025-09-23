// components/epub/epub-options-form.tsx
'use client';

import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PublishOptions {
  includeMetadata: boolean;
  includeCover: boolean;
  includeTOC: boolean;
  tocLevel: number;
}

interface EpubOptionsFormProps {
  options: PublishOptions;
  onOptionChange: <K extends keyof PublishOptions>(key: K, value: PublishOptions[K]) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export function EpubOptionsForm({ options, onOptionChange, onSubmit, isLoading }: EpubOptionsFormProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">EPUB Generation Settings</CardTitle>
          <CardDescription>
            Customize how your EPUB will be generated
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-4">
              <OptionItem
                id="includeMetadata"
                label="Include Imprint"
                checked={options.includeMetadata}
                onChange={(checked) => onOptionChange('includeMetadata', checked)}
                disabled={isLoading}
              />
              
              <OptionItem
                id="includeCover"
                label="Include Cover"
                checked={options.includeCover}
                onChange={(checked) => onOptionChange('includeCover', checked)}
                disabled={isLoading}
              />
              
              <OptionItem
                id="includeTOC"
                label="Include Table of Contents"
                checked={options.includeTOC}
                onChange={(checked) => onOptionChange('includeTOC', checked)}
                disabled={isLoading}
              />
            </div>
            
            <motion.div
              className="pt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 px-4 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2" />
                    Generating...
                  </span>
                ) : 'Generate EPUB'}
              </button>
            </motion.div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface OptionItemProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function OptionItem({ id, label, checked, onChange, disabled }: OptionItemProps) {
  return (
    <motion.div 
      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(checked) => onChange(checked === true)}
        disabled={disabled}
        className="h-5 w-5"
      />
      <Label 
        htmlFor={id} 
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label}
      </Label>
    </motion.div>
  );
}