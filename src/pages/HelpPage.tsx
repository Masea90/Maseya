import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { Mail, MessageCircle, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const faqs = [
  {
    q: 'How does MASEYA personalize recommendations?',
    a: 'We use your skin concerns, hair type, goals, and sensitivities to match you with clean beauty products that suit your profile. No data is shared with third parties.',
  },
  {
    q: 'How do I earn points?',
    a: 'Complete routine steps (+2 pts each), finish a full routine (+5 bonus), post in the community (+3 pts), or explore product recommendations (+3 pts).',
  },
  {
    q: 'What is the Glow Score?',
    a: 'Your Glow Score reflects how consistently you follow your skin and hair care routines. It is calculated from your profile completeness, routine activity, and streak.',
  },
  {
    q: 'Can I customize my routine?',
    a: 'Yes! Tap the edit icon on the Routine page to add, remove, or reorder steps. Your custom routine is saved to your account.',
  },
  {
    q: 'How do push notifications work?',
    a: 'Enable them in Settings → Notifications. You'll receive gentle reminders for your morning and night routines, plus community activity alerts.',
  },
  {
    q: 'Is MASEYA free?',
    a: 'The core features (routines, community, recommendations, rewards) are free. Premium features like AI Skin Scanner are available with a premium subscription.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Go to Settings → Privacy → Delete my account, or email us at support@maseya.es.',
  },
];

const HelpPage = () => {
  const { t } = useUser();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <AppLayout title={t('helpSupport')}>
      <div className="px-4 py-6 space-y-6 animate-fade-in">
        {/* Contact */}
        <div className="bg-card rounded-2xl p-5 shadow-warm space-y-3">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Contact Us
          </h2>
          <p className="text-sm text-muted-foreground">
            Have a question or feedback? We'd love to hear from you.
          </p>
          <a
            href="mailto:support@maseya.es"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Mail className="w-4 h-4" />
            support@maseya.es
          </a>
        </div>

        {/* FAQ */}
        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <button
                key={i}
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full text-left bg-card rounded-xl p-4 shadow-warm transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-sm text-foreground">{faq.q}</p>
                  <ChevronDown className={cn(
                    'w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5 transition-transform',
                    openIndex === i && 'rotate-180'
                  )} />
                </div>
                {openIndex === i && (
                  <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-border animate-fade-in">
                    {faq.a}
                  </p>
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
