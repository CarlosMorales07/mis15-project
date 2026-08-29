"use client";

import {
  useEffect,
  useState
} from "react";

import {
  createPortal
} from "react-dom";

import {
  Check,
  QrCode,
  Share2,
  X
} from "lucide-react";


const EVENT_URL =
  "https://fernanda-mis15.vercel.app";


export default function EventQrButton() {

  const [
    open,
    setOpen
  ] =
    useState(false);


  const [
    copied,
    setCopied
  ] =
    useState(false);


  /*
   * =====================================================
   * BLOQUEAR SCROLL
   * =====================================================
   */

  useEffect(
    () => {

      if (
        !open
      ) {

        return;

      }


      const scrollY =
        window.scrollY;


      const body =
        document.body;


      const html =
        document.documentElement;


      const previousBehavior =
        html.style.scrollBehavior;


      body.style.position =
        "fixed";

      body.style.top =
        `-${scrollY}px`;

      body.style.left =
        "0";

      body.style.right =
        "0";

      body.style.width =
        "100%";


      html.style.overflow =
        "hidden";


      return () => {

        html.style.scrollBehavior =
          "auto";


        body.style.position =
          "";

        body.style.top =
          "";

        body.style.left =
          "";

        body.style.right =
          "";

        body.style.width =
          "";


        html.style.overflow =
          "";


        window.scrollTo(
          0,
          scrollY
        );


        requestAnimationFrame(
          () => {

            html.style.scrollBehavior =
              previousBehavior;

          }
        );

      };

    },
    [
      open
    ]
  );


  /*
   * =====================================================
   * COMPARTIR
   * =====================================================
   */

  async function shareAccess() {

    try {

      if (
        typeof navigator.share ===
        "function"
      ) {

        await navigator.share({

          title:
            "Mis 15 Años | Fernanda",

          text:
            "Comparte tus fotos y recuerdos de los 15 años de Fernanda.",

          url:
            EVENT_URL

        });


        return;

      }


      await navigator.clipboard.writeText(
        EVENT_URL
      );


      setCopied(
        true
      );


      window.setTimeout(
        () => {

          setCopied(
            false
          );

        },
        2500
      );


    } catch (
      error
    ) {

      if (
        error instanceof DOMException &&
        error.name ===
          "AbortError"
      ) {

        return;

      }


      console.error(
        "No se pudo compartir:",
        error
      );

    }

  }


  return (

    <>

      {/* =================================================
          BOTÓN DISCRETO
      ================================================== */}

      <button
        type="button"
        onClick={
          () =>
            setOpen(
              true
            )
        }
        className="
          group
          inline-flex
          min-h-11
          items-center
          justify-center
          gap-2
          rounded-full
          border
          border-[#d5bdce]
          bg-white/55
          px-5
          text-sm
          font-semibold
          text-[#765071]
          shadow-sm
          backdrop-blur-md
          transition-all
          duration-200

          hover:scale-[1.03]
          hover:bg-white/80

          active:scale-[0.98]
        "
      >

        <QrCode
          size={18}
          className="
            transition-transform
            duration-200
            group-hover:scale-110
          "
        />

        Mostrar QR

      </button>


      {/* =================================================
          MODAL
      ================================================== */}

      {
        open &&
        createPortal(

          <div
            className="
              fixed
              inset-0
              z-[15000]
              flex
              h-[100dvh]
              w-screen
              items-center
              justify-center
              overflow-hidden
              bg-black/80
              p-3
              backdrop-blur-md

              sm:p-6
            "
            role="dialog"
            aria-modal="true"
          >

            <div
              className="
                relative
                flex
                max-h-[calc(100dvh-24px)]
                w-full
                max-w-[430px]
                flex-col
                overflow-hidden
                rounded-[30px]
                bg-[#fffaf4]
                shadow-2xl
              "
            >

              {/* CERRAR */}

              <button
                type="button"
                onClick={
                  () =>
                    setOpen(
                      false
                    )
                }
                aria-label="Cerrar código QR"
                className="
                  absolute
                  right-3
                  top-3
                  z-20
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-full
                  bg-white/95
                  text-[#684e62]
                  shadow-lg
                  backdrop-blur
                  transition-all
                  duration-200

                  hover:scale-110
                  hover:bg-[#765071]
                  hover:text-white
                "
              >

                <X
                  size={23}
                />

              </button>


              {/* POSTER */}

              <div
                className="
                  min-h-0
                  flex-1
                  overflow-y-auto
                  bg-[#fffaf4]
                  p-2
                "
              >

                <img
                  src="/design/poster-qr.png"
                  alt="Código QR para compartir los recuerdos de los 15 años de Fernanda"
                  className="
                    mx-auto
                    h-auto
                    max-h-[72dvh]
                    w-auto
                    max-w-full
                    rounded-[22px]
                    object-contain
                  "
                />

              </div>


              {/* ACCIONES */}

              <div
                className="
                  shrink-0
                  border-t
                  border-[#eadfe8]
                  bg-[#fffaf4]
                  px-4
                  pb-[calc(env(safe-area-inset-bottom)+16px)]
                  pt-4
                "
              >

                <p
                  className="
                    text-center
                    text-xs
                    leading-5
                    text-[#80677b]
                  "
                >
                  Muéstrale este código a otra persona
                  para que pueda entrar y compartir sus fotos.
                </p>


                <button
                  type="button"
                  onClick={
                    () =>
                      void shareAccess()
                  }
                  className="
                    mt-3
                    flex
                    min-h-12
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-full
                    bg-[#765071]
                    px-5
                    font-semibold
                    text-white
                    shadow-md
                    transition-all
                    duration-200

                    hover:bg-[#5f3e5b]

                    active:scale-[0.98]
                  "
                >

                  {
                    copied

                      ? (
                        <>
                          <Check
                            size={19}
                          />

                          Enlace copiado
                        </>
                      )

                      : (
                        <>
                          <Share2
                            size={19}
                          />

                          Compartir invitación
                        </>
                      )
                  }

                </button>

              </div>

            </div>

          </div>,

          document.body

        )
      }

    </>

  );

}