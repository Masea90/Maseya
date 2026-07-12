import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

const PrivacyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-background pb-16">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="w-full sm:max-w-2xl sm:mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/scan'))}
            aria-label="Volver"
            className="p-1 -ml-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-lg font-semibold">Política de privacidad</h1>
        </div>
      </header>

      <main className="w-full sm:max-w-2xl sm:mx-auto px-5 py-6 space-y-6 text-[15px] leading-relaxed text-foreground/90">
        <div className="flex items-center gap-3 rounded-2xl bg-secondary/40 p-4">
          <div className="w-11 h-11 rounded-2xl bg-primary/15 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            En Maseya tratamos tus datos con el mínimo imprescindible y con respeto al RGPD.
          </p>
        </div>

        <section className="space-y-2">
          <h2 className="font-display text-base font-semibold">Responsable del tratamiento</h2>
          <p>
            Asmae Oumanzou. Contacto:{' '}
            <a className="underline underline-offset-2" href="mailto:team@maseya.es">
              team@maseya.es
            </a>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base font-semibold">Datos que tratamos</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Datos de cuenta: dirección de email.</li>
            <li>
              Perfil de salud facilitado voluntariamente: alergias e intolerancias, tipo y
              condiciones de piel, embarazo o lactancia, y preferencias de dieta.
            </li>
            <li>Historial de escaneos de productos.</li>
            <li>Productos que aportas mediante foto de etiqueta.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base font-semibold">Finalidades</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Prestar el servicio de análisis de productos.</li>
            <li>
              Personalizar los análisis según tu perfil de salud, únicamente si has dado tu
              consentimiento explícito.
            </li>
            <li>Mejorar nuestra base de datos de productos.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base font-semibold">Base legal</h2>
          <p>
            Ejecución del servicio para la cuenta y el historial de escaneos. Para el tratamiento
            de los datos de salud aplicamos el consentimiento explícito (art. 9.2.a RGPD),
            revocable en cualquier momento sin afectar al uso básico de la app.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base font-semibold">Destinatarios</h2>
          <p>
            Los datos se alojan en la infraestructura de Supabase/Lovable (UE/EEUU con garantías
            adecuadas). Los análisis con IA procesan tu perfil de forma puntual para generar la
            explicación; no se utilizan para entrenar modelos. Las consultas a Open Food Facts y
            Open Beauty Facts se realizan únicamente con el código de barras del producto, nunca
            con tus datos personales.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base font-semibold">Conservación</h2>
          <p>
            Conservamos tus datos mientras mantengas tu cuenta activa. Puedes solicitar su
            eliminación en cualquier momento.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base font-semibold">Tus derechos</h2>
          <p>
            Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación
            y portabilidad escribiendo a{' '}
            <a className="underline underline-offset-2" href="mailto:team@maseya.es">
              team@maseya.es
            </a>
            . También tienes derecho a presentar una reclamación ante la Agencia Española de
            Protección de Datos (
            <a
              className="underline underline-offset-2"
              href="https://www.aepd.es"
              target="_blank"
              rel="noopener noreferrer"
            >
              www.aepd.es
            </a>
            ).
          </p>
        </section>

        <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground/80">Aviso: </span>
            Maseya ofrece información orientativa y no sustituye el consejo de un médico,
            dermatólogo o nutricionista.
          </p>
        </div>

        <p className="text-xs text-muted-foreground">Última actualización: julio 2026.</p>
      </main>
    </div>
  );
};

export default PrivacyPage;
