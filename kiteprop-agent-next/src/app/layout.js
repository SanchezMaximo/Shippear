import "./globals.css";

export const metadata = {
  title: "Agente Inmobiliario · KiteProp",
  description: "Agente de IA para inmobiliarias integrado con el MCP de KiteProp.",
};

// Nota: se carga la fuente via <link> (en vez de next/font/google) para que
// el build no dependa de acceso a fonts.googleapis.com en tiempo de build
// (por ejemplo, en entornos de CI/sandbox sin salida a internet). En runtime
// el navegador del usuario la descarga igual, sin impacto funcional.
export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
