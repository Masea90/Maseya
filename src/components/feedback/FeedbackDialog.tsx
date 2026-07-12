import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { useLocation } from 'react-router-dom';

type Lang = 'es' | 'en' | 'fr';

const COPY: Record<Lang, {
  title: string;
  subtitle: string;
  messageLabel: string;
  messagePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  cancel: string;
  send: string;
  sending: string;
  thanks: string;
  error: string;
  required: string;
}> = {
  es: {
    title: 'Ayúdanos a mejorar',
    subtitle: 'Tu opinión nos ayuda a mejorar Maseya.',
    messageLabel: 'Cuéntanos qué ha pasado o qué mejorarías',
    messagePlaceholder: 'Escribe aquí tu comentario...',
    emailLabel: 'Email (opcional, para poder responderte)',
    emailPlaceholder: 'tu@email.com',
    cancel: 'Cancelar',
    send: 'Enviar',
    sending: 'Enviando...',
    thanks: '¡Gracias por tu feedback!',
    error: 'No se pudo enviar. Inténtalo de nuevo.',
    required: 'Escribe un comentario antes de enviar.',
  },
  en: {
    title: 'Help us improve',
    subtitle: 'Your feedback helps us make Maseya better.',
    messageLabel: 'Tell us what happened or what you would improve',
    messagePlaceholder: 'Write your feedback here...',
    emailLabel: 'Email (optional, so we can reply)',
    emailPlaceholder: 'you@email.com',
    cancel: 'Cancel',
    send: 'Send',
    sending: 'Sending...',
    thanks: 'Thanks for your feedback!',
    error: 'Could not send. Please try again.',
    required: 'Please write a comment before sending.',
  },
  fr: {
    title: 'Aide-nous à améliorer',
    subtitle: 'Ton avis nous aide à améliorer Maseya.',
    messageLabel: 'Dis-nous ce qui s\'est passé ou ce que tu améliorerais',
    messagePlaceholder: 'Écris ton commentaire ici...',
    emailLabel: 'Email (optionnel, pour te répondre)',
    emailPlaceholder: 'toi@email.com',
    cancel: 'Annuler',
    send: 'Envoyer',
    sending: 'Envoi...',
    thanks: 'Merci pour ton retour !',
    error: 'Envoi impossible. Réessaie.',
    required: 'Écris un commentaire avant d\'envoyer.',
  },
};

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extraContext?: Record<string, unknown>;
}

export const FeedbackDialog = ({ open, onOpenChange, extraContext }: FeedbackDialogProps) => {
  const { currentUser } = useAuth();
  const { user } = useUser();
  const location = useLocation();
  const lang = (user.language as Lang) || 'es';
  const c = COPY[lang] ?? COPY.es;

  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setMessage('');
      setEmail(currentUser?.email || '');
    }
  }, [open, currentUser?.email]);

  const submit = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error(c.required);
      return;
    }
    setSending(true);
    const context = {
      route: location.pathname,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      app_lang: lang,
      ...(extraContext || {}),
    };
    const { error } = await supabase.from('feedback').insert([{
      type: 'feedback',
      user_id: currentUser?.id ?? null,
      email: email.trim() || null,
      message: trimmed,
      context,
    }]);
    setSending(false);
    if (error) {
      console.error('[feedback] insert', error);
      toast.error(c.error);
      return;
    }
    toast.success(c.thanks);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display">{c.title}</DialogTitle>
          <DialogDescription>{c.subtitle}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{c.messageLabel}</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={c.messagePlaceholder}
              rows={5}
              maxLength={2000}
              className="rounded-xl resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{c.emailLabel}</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={c.emailPlaceholder}
              maxLength={255}
              className="rounded-xl"
            />
          </div>
        </div>
        <DialogFooter className="flex flex-row gap-2 sm:justify-end">
          <Button
            variant="outline"
            className="flex-1 rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            {c.cancel}
          </Button>
          <Button
            className="flex-1 rounded-xl"
            onClick={submit}
            disabled={sending}
          >
            {sending ? c.sending : c.send}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
