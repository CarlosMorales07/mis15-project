"use client";

import {
  useEffect,
  useState
} from "react";

import Link
  from "next/link";

import {
  Sparkles
} from "lucide-react";

import {
  ensureAnonymousSession
} from "@/lib/supabase";

import {
  eventConfig
} from "@/lib/event-config";


export default function WelcomePage() {

  const [
    ready,
    setReady
  ] =
    useState(false);


  useEffect(
    () => {

      ensureAnonymousSession()

        .then(
          () =>
            setReady(true)
        )

        .catch(
          console.error
        );

    },

    []

  );


  return (

    <main
      className="
        relative
        flex
        min-h-screen
        items-center
        justify-center
        overflow-hidden
        px-5
        py-10
      "
    >

      <div
        className="
          absolute
          -left-12
          top-0
          h-52
          w-52
          rounded-full
          bg-pink-200/30
          blur-3xl
        "
      />


      <div
        className="
          absolute
          -right-8
          top-24
          h-64
          w-64
          rounded-full
          bg-purple-200/30
          blur-3xl
        "
      />


      <section
        className="
          relative
          z-10
          w-full
          max-w-xl
          rounded-[36px]
          border
          border-white/80
          bg-white/70
          p-7
          text-center
          shadow-2xl
          backdrop-blur-md
          sm:p-10
        "
      >

        <Sparkles
          className="
            mx-auto
            text-[#bd8a41]
          "
          size={32}
        />


        <p
          className="
            mt-5
            text-sm
            font-semibold
            tracking-[0.32em]
            text-[#a17035]
          "
        >

          MIS 15 AÑOS

        </p>


        <h1
          className="
            mt-3
            text-6xl
            font-light
            italic
            tracking-tight
            text-[#765071]
            sm:text-7xl
          "
        >

          {
            eventConfig.name
          }

        </h1>


        <p
          className="
            mt-4
            text-sm
            tracking-[0.2em]
            text-[#8c6c7e]
          "
        >

          {
            eventConfig.dateLabel
          }

        </p>


        <div
          className="
            mx-auto
            my-7
            h-px
            w-28
            bg-gradient-to-r
            from-transparent
            via-[#bd8a41]
            to-transparent
          "
        />


        <p
          className="
            mx-auto
            max-w-md
            text-lg
            leading-8
            text-[#684e62]
          "
        >

          Gracias por acompañarme
          en una noche tan especial.

        </p>


        <Link
          href="/recuerdos"
          aria-disabled={
            !ready
          }
          className={`
            mt-8
            inline-flex
            min-h-14
            items-center
            justify-center
            rounded-full
            px-8
            font-semibold
            text-white
            shadow-lg

            ${
              ready

                ? "bg-[#765071]"

                : "pointer-events-none bg-[#b7a8b4]"
            }
          `}
        >

          Entrar ✨

        </Link>


        {
          !ready && (

            <p
              className="
                mt-3
                text-xs
                text-[#8c7386]
              "
            >

              Preparando tu experiencia…

            </p>

          )
        }

      </section>

    </main>

  );

}