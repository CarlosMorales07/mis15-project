import type {
  Metadata,
  Viewport
} from "next";

import {
  Cormorant_Garamond,
  Great_Vibes,
  Montserrat
} from "next/font/google";

import "./globals.css";

import PwaBoot
  from "@/components/PwaBoot";


const montserrat =
  Montserrat({
    subsets: [
      "latin"
    ],
    variable:
      "--font-body",
    display:
      "swap"
  });


const cormorant =
  Cormorant_Garamond({
    subsets: [
      "latin"
    ],
    variable:
      "--font-title",
    weight: [
      "400",
      "500",
      "600",
      "700"
    ],
    display:
      "swap"
  });


const greatVibes =
  Great_Vibes({
    subsets: [
      "latin"
    ],
    variable:
      "--font-script",
    weight:
      "400",
    display:
      "swap"
  });


export const metadata:
  Metadata = {

  metadataBase:
    new URL(
      "https://fernanda-mis15.vercel.app"
    ),

  title:
    "Mis 15 Años | Fernanda",

  description:
    "Comparte y revive los momentos especiales de los 15 años de Fernanda.",

  manifest:
    "/manifest.webmanifest",

  openGraph: {

    title:
      "Mis 15 Años | Fernanda",

    description:
      "Comparte y revive los momentos especiales de los 15 años de Fernanda.",

    url:
      "https://fernanda-mis15.vercel.app",

    siteName:
      "Mis 15 Años | Fernanda",

    locale:
      "es_EC",

    type:
      "website",

    images: [
      {

        url:
          "/design/preview-whatsapp.jpg",

        width:
          1200,

        height:
          630,

        alt:
          "Mis 15 Años de Fernanda"

      }
    ]

  },

  twitter: {

    card:
      "summary_large_image",

    title:
      "Mis 15 Años | Fernanda",

    description:
      "Comparte y revive los momentos especiales de los 15 años de Fernanda.",

    images: [
      "/design/preview-whatsapp.jpg"
    ]

  },

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

  viewportFit:
    "cover",

  themeColor:
    "#fff8f4"

};


export default function RootLayout({

  children

}: Readonly<{

  children:
    React.ReactNode;

}>) {

  return (

    <html
      lang="es"
      data-scroll-behavior="smooth"
    >

      <body
        className={`
          ${montserrat.variable}
          ${cormorant.variable}
          ${greatVibes.variable}
        `}
      >

        <div
          className="event-background"
          aria-hidden="true"
        />

        <PwaBoot />

        {children}

      </body>

    </html>

  );

}