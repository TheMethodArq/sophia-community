import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      <header className="h-16 border-b border-glass-border flex items-center px-6 bg-glass-surface backdrop-blur-md fixed w-full z-10">
        <div className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent to-purple-400">
          Sophia Code Community
        </div>
      </header>
      
      <main className="flex-1 pt-20 px-6 pb-10 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
};
