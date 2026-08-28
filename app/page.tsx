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


export default function HomePage() {

  const [
    ready,
    setReady
  ] =
    useState(false);


  const [
    authError,
    setAuthError
  ] =
    useState(false);


  useEffect(
    () => {

      let active =
        true;


      async function prepareSession() {

        try {

          await ensureAnonymousSession();


          if (
            active
          ) {

            setReady(
              true
            );

          }

        } catch (
          error
        ) {

          console.error(
            "Error preparando sesión:",
            error
          );


          if (
            active
          ) {

            setAuthError(
              true
            );

          }

        }

      }


      void prepareSession();


      return () => {

        active =
          false;

      };

    },
    []
  );


  return (

    <main
      className="
        relative
        flex
        min-h-screen
        min-h-[100dvh]
        items-center
        justify-center
        px-4
        py-8

        sm:px-6
        lg:px-8
      "
    >

      <section
        className="
          event-glass
          relative
          w-full
          max-w-[640px]
          overflow-hidden
          rounded-[32px]
          px-6
          py-9
          text-center

          sm:px-10
          sm:py-11

          lg:max-w-[650px]
          lg:px-14
          lg:py-12
        "
      >

        {/* BRILLO */}

        <div
          className="
            pointer-events-none
            absolute
            left-1/2
            top-0
            h-32
            w-72
            -translate-x-1/2
            rounded-full
            bg-[#f6e3eb]/60
            blur-3xl
          "
          aria-hidden="true"
        />


        {/* DESTELLO */}

        <div
          className="
            relative
            mx-auto
            flex
            h-11
            w-11
            items-center
            justify-center
            text-[#b38136]
          "
        >

          <Sparkles
            size={31}
            strokeWidth={1.6}
          />

        </div>


        {/* MIS 15 AÑOS */}

        <p
          className="
            font-title
            relative
            mt-2
            text-[1rem]
            font-semibold
            uppercase
            tracking-[0.30em]
            text-[#a66f2c]

            sm:text-[1.1rem]
          "
        >
          Mis 15 Años
        </p>


        {/* FERNANDA */}

        <h1
          className="
            font-script
            relative
            mt-2
            text-[4.8rem]
            font-normal
            leading-[0.90]
            text-[#765071]

            sm:text-[6rem]

            lg:text-[6.6rem]
          "
        >
          {eventConfig.name}
        </h1>


        {/* FECHA */}

        <p
          className="
            relative
            mt-5
            text-[0.72rem]
            font-medium
            tracking-[0.22em]
            text-[#9b7487]

            sm:text-sm
          "
        >
          {eventConfig.dateLabel}
        </p>


        {/* DIVISOR */}

        <div
          className="
            relative
            mx-auto
            mt-7
            flex
            items-center
            justify-center
            gap-3
          "
        >

          <span
            className="
              h-px
              w-16
              bg-gradient-to-r
              from-transparent
              to-[#d4aa67]
            "
          />


          <Sparkles
            size={15}
            className="
              text-[#c18e43]
            "
          />


          <span
            className="
              h-px
              w-16
              bg-gradient-to-l
              from-transparent
              to-[#d4aa67]
            "
          />

        </div>


        {/* MENSAJE */}

        <p
          className="
            relative
            mx-auto
            mt-7
            max-w-lg
            text-sm
            leading-7
            text-[#6d5368]

            sm:text-base
          "
        >
          Gracias por acompañarme en una noche tan especial.
        </p>


        {/* BOTÓN */}

        <div
          className="
            relative
            mt-7
          "
        >

          {
            ready

              ? (

                <Link
                  href="/recuerdos"
                  className="
                    group
                    inline-flex
                    min-h-12
                    items-center
                    justify-center
                    gap-2
                    rounded-full
                    bg-[#765071]
                    px-8
                    font-semibold
                    text-white
                    shadow-[0_10px_25px_rgba(118,80,113,0.28)]
                    transition-all
                    duration-200

                    hover:scale-105
                    hover:bg-[#5f3e5b]

                    active:scale-[0.98]
                  "
                >

                  Entrar

                  <Sparkles
                    size={17}
                    className="
                      transition-transform
                      duration-200
                      group-hover:rotate-12
                      group-hover:scale-110
                    "
                  />

                </Link>

              )

              : authError

                ? (

                  <button
                    type="button"
                    onClick={
                      () =>
                        window.location.reload()
                    }
                    className="
                      min-h-12
                      rounded-full
                      bg-[#765071]
                      px-8
                      font-semibold
                      text-white
                      shadow-lg
                      transition-all
                      hover:scale-105
                      hover:bg-[#5f3e5b]
                    "
                  >
                    Intentar nuevamente
                  </button>

                )

                : (

                  <button
                    type="button"
                    disabled
                    className="
                      inline-flex
                      min-h-12
                      items-center
                      gap-2
                      rounded-full
                      bg-[#765071]/70
                      px-8
                      font-semibold
                      text-white
                    "
                  >

                    <span
                      className="
                        h-4
                        w-4
                        animate-spin
                        rounded-full
                        border-2
                        border-white/40
                        border-t-white
                      "
                    />

                    Preparando...

                  </button>

                )
          }

        </div>

      </section>

    </main>

  );

}