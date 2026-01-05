import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { Header } from './Header';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  showHeader?: boolean;
  showSearch?: boolean;
  showNotifications?: boolean;
  showSettings?: boolean;
}

export const AppLayout = ({
  children,
  title,
  showHeader = true,
  showSearch = false,
  showNotifications = false,
  showSettings = false,
}: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      {showHeader && (
        <Header
          title={title}
          showSearch={showSearch}
          showNotifications={showNotifications}
          showSettings={showSettings}
        />
      )}
      <main className="flex-1 pb-20 overflow-y-auto">{children}</main>
      <BottomNav />
    </div>
  );
};
