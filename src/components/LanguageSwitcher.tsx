import { useState } from 'react';
import { Check, Globe } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { languages, Language } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const LABEL: Record<Language, string> = { es: 'ES', en: 'EN', fr: 'FR' };

/**
 * Always-visible language picker. Placed on the welcome screen (top right) so a
 * newcomer who lands on a language they don't understand can switch instantly.
 */
export const LanguageSwitcher = ({ variant = 'light' }: { variant?: 'light' | 'dark' }) => {
  const { user, setLanguage } = useUser();
  const [open, setOpen] = useState(false);
  const current = languages.find(l => l.code === user.language) ?? languages[1];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Change language / Cambiar idioma / Changer de langue"
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 h-9 text-sm font-semibold transition-colors',
            variant === 'light'
              ? 'bg-white/15 text-white backdrop-blur hover:bg-white/25'
              : 'border border-border bg-card text-foreground hover:bg-secondary',
          )}
        >
          <Globe className="w-4 h-4" />
          <span>{current.flag}</span>
          <span>{LABEL[current.code]}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem] z-[70]">
        {languages.map(lang => (
          <DropdownMenuItem
            key={lang.code}
            onSelect={() => setLanguage(lang.code)}
            className="gap-2 cursor-pointer"
          >
            <span>{lang.flag}</span>
            <span className="flex-1">{lang.label}</span>
            {user.language === lang.code && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
