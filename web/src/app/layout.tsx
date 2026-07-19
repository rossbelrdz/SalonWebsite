import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getDefaultTenant } from "@/lib/auth";
import { themeStyleTag } from "@/lib/theme";
import { PwaRegister } from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "Salon — Citas y operación",
  description: "Plataforma para salones de belleza y barberías",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Salon",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1f4d3a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let themeCss = themeStyleTag();
  try {
    const tenant = await getDefaultTenant();
    themeCss = themeStyleTag(
      tenant.settings?.themePrimary,
      tenant.settings?.themeAccent,
    );
  } catch {
    // seed aún no corrió
  }

  return (
    <html lang="es">
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      </head>
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
