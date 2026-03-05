import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { Mail, MessageCircle, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { TranslationKey } from '@/lib/i18n';

const faqKeys: { q: TranslationKey; a: TranslationKey }[] = [
  { q: 'helpFaq1Q', a: 'helpFaq1A' },
  { q: 'helpFaq2Q', a: 'helpFaq2A' },
  { q: 'helpFaq3Q', a: 'helpFaq3A' },
  { q: 'helpFaq4Q', a: 'helpFaq4A' },
  { q: 'helpFaq5Q', a: 'helpFaq5A' },
  { q: 'helpFaq6Q', a: 'helpFaq6A' },
  { q: 'helpFaq7Q', a: 'helpFaq7A' },
];

const HelpPage = () => {
  const { t } = useUser();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <AppLayout title={t('helpSupport')}>
      <div className="px-4 py-6 space-y-6 animate-fade-in">
        <div className="bg-card rounded-2xl p-5 shadow-warm space-y-3">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            {t('helpContactTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('helpContactDesc')}</p>
          <a href="mailto:support@maseya.es" className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
            <Mail className="w-4 h-4" /> support@maseya.es
          </a>
        </div>

        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold">{t('helpFaqTitle')}</h2>
          <div className="space-y-2">
            {faqKeys.map((faq, i) => (
              <button key={i} onClick={() => setOpenIndex(openIndex === i ? null : i)} className="w-full text-left bg-card rounded-xl p-4 shadow-warm transition-all">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-sm text-foreground">{t(faq.q)}</p>
                  <ChevronDown className={cn('w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5 transition-transform', openIndex === i && 'rotate-180')} />
                </div>
                {openIndex === i && (
                  <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-border animate-fade-in">{t(faq.a)}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default HelpPage;
