import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Share, Plus, Check, Smartphone, Apple } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPage() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Install MASEYA</h1>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-6">
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
            <span className="text-4xl">🌿</span>
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground">
              Get MASEYA on Your Phone
            </h2>
            <p className="text-muted-foreground mt-2">
              Install the app for a better experience – no app store needed!
            </p>
          </div>
        </div>

        {/* Already Installed */}
        {isInstalled && (
          <Card className="border-primary bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                  <Check className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Already Installed!</p>
                  <p className="text-sm text-muted-foreground">
                    MASEYA is on your home screen
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Android Install Button */}
        {!isInstalled && deferredPrompt && (
          <Button
            onClick={handleInstall}
            className="w-full h-14 text-lg"
            size="lg"
          >
            <Download className="h-5 w-5 mr-2" />
            Install MASEYA
          </Button>
        )}

        {/* iOS Instructions */}
        {!isInstalled && isIOS && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                  <Apple className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">Install on iPhone/iPad</h3>
              </div>

              <ol className="space-y-4 text-sm">
                <li className="flex gap-3">
                  <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    1
                  </span>
                  <div>
                    <p className="font-medium">Tap the Share button</p>
                    <p className="text-muted-foreground flex items-center gap-1">
                      Look for <Share className="h-4 w-4" /> at the bottom of Safari
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    2
                  </span>
                  <div>
                    <p className="font-medium">Scroll down and tap "Add to Home Screen"</p>
                    <p className="text-muted-foreground flex items-center gap-1">
                      Look for <Plus className="h-4 w-4" /> Add to Home Screen
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    3
                  </span>
                  <div>
                    <p className="font-medium">Tap "Add" in the top right</p>
                    <p className="text-muted-foreground">
                      MASEYA will appear on your home screen!
                    </p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>
        )}

        {/* Android Instructions (fallback if no prompt) */}
        {!isInstalled && isAndroid && !deferredPrompt && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                  <Smartphone className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">Install on Android</h3>
              </div>

              <ol className="space-y-4 text-sm">
                <li className="flex gap-3">
                  <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    1
                  </span>
                  <div>
                    <p className="font-medium">Tap the menu button</p>
                    <p className="text-muted-foreground">
                      Look for ⋮ in the top right of Chrome
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    2
                  </span>
                  <div>
                    <p className="font-medium">Tap "Add to Home screen"</p>
                    <p className="text-muted-foreground">
                      Or "Install app" if available
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    3
                  </span>
                  <div>
                    <p className="font-medium">Tap "Add"</p>
                    <p className="text-muted-foreground">
                      MASEYA will appear on your home screen!
                    </p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>
        )}

        {/* Benefits */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Why install?</h3>
          <div className="grid gap-3">
            {[
              { icon: "⚡", title: "Faster loading", desc: "App loads instantly" },
              { icon: "📱", title: "Full screen", desc: "No browser bars" },
              { icon: "🔔", title: "Notifications", desc: "Get beauty reminders" },
              { icon: "📶", title: "Works offline", desc: "Browse without internet" },
            ].map((benefit) => (
              <Card key={benefit.title}>
                <CardContent className="p-3 flex items-center gap-3">
                  <span className="text-xl">{benefit.icon}</span>
                  <div>
                    <p className="font-medium text-sm">{benefit.title}</p>
                    <p className="text-xs text-muted-foreground">{benefit.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
