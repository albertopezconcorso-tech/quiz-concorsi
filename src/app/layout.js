import './globals.css';

export const metadata = {
  title: 'Quiz Concorsi - Simulatore Ufficiale',
  description: 'Piattaforma di preparazione e simulazione quiz per concorsi pubblici',
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body className="bg-[#0B1220] text-[#E8ECF8] antialiased m-0 p-0">
        {children}
      </body>
    </html>
  );
}