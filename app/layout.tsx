import type {
  Metadata,
  Viewport
} from "next";

import "./globals.css";

import PwaBoot
  from "@/components/PwaBoot";


export const metadata:
  Metadata = {

  title:
    "Mis 15 Años · Fernanda",

  description:
    "Comparte los recuerdos de los 15 años de Fernanda.",

  manifest:
    "/manifest.webmanifest",

  robots: {

    index:
      false,

    follow:
      false

  }

};


export const viewport:
  Viewport = {

  width:
    "device-width",

  initialScale:
    1,

  themeColor:
    "#fffaf2",

  viewportFit:
    "cover"

};


export default function RootLayout(
  {
    children
  }: {
    children:
      React.ReactNode
  }
) {

  return (

    <html
      lang="es"
    >

      <body>

        <PwaBoot />

        {
          children
        }

      </body>

    </html>

  );

}