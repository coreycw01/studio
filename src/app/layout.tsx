import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'Noesis - Turn thought into understanding',
  description: 'A personal philosophy workspace for mapping concepts, examining positions, building works, and testing practices.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
try {
  var saved = JSON.parse(localStorage.getItem('noesis:theme') || '{}');
  var mode = saved.themeMode || 'light';
  var accent = saved.accentTheme || 'violet';
  var dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.setAttribute('data-theme', accent);
} catch (error) {
  console.warn('Theme init failed', error);
}
            `.trim(),
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Spectral:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased selection:bg-accent/20 selection:text-accent-foreground">{children}</body>
    </html>
  );
}
