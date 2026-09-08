import './globals.css';

export const metadata = {
  title: 'Quiz Concorsi - Simulatore Ufficiale',
  description: 'Piattaforma di preparazione e simulazione quiz per concorsi pubblici',
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body className="bg-[#23272D] text-[#F8FAFC] antialiased m-0 p-0">
        {children}
      </body>
    </html>
  );
}