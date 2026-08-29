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


  /* =====================================================
     BLOQUEAR SCROLL CUANDO ABRE EL QR
     ===================================================== */

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


      const previousPosition =
        body.style.position;

      const previousTop =
        body.style.top;

      const previousLeft =
        body.style.left;

      const previousRight =
        body.style.right;

      const previousWidth =
        body.style.width;

      const previousOverflow =
        body.style.overflow;

      const previousHtmlOverflow =
        html.style.overflow;

      const previousScrollBehavior =
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

      body.style.overflow =
        "hidden";


      html.style.overflow =
        "hidden";


      return () => {

        html.style.scrollBehavior =
          "auto";


        html.style.overflow =
          previousHtmlOverflow;


        body.style.position =
          previousPosition;

        body.style.top =
          previousTop;

        body.style.left =
          previousLeft;

        body.style.right =
          previousRight;

        body.style.width =
          previousWidth;

        body.style.overflow =
          previousOverflow;


        window.scrollTo(
          0,
          scrollY
        );


        window.requestAnimationFrame(
          () => {

            html.style.scrollBehavior =
              previousScrollBehavior;

          }
        );

      };

    },
    [
      open
    ]
  );


  /* =====================================================
     COMPARTIR ENLACE
     ===================================================== */

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
        "No se pudo compartir el enlace:",
        error
      );

    }

  }


  return (

    <>

      {/* =================================================
          BOTÓN MOSTRAR QR
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
        />

        Mostrar QR

      </button>


      {/* =================================================
          VENTANA QR
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
              bg-black/75
              p-4
              backdrop-blur-md
            "
            role="dialog"
            aria-modal="true"
          >

            <div
              className="
                relative
                w-full
                max-w-sm
                rounded-[32px]
                bg-[#fffaf4]
                px-5
                pb-5
                pt-7
                text-center
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
                  bg-white
                  text-[#684e62]
                  shadow-lg
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


              {/* TÍTULO */}

              <div
                className="
                  px-8
                "
              >

                <p
                  className="
                    text-xs
                    font-semibold
                    tracking-[0.22em]
                    text-[#ad7c3d]
                  "
                >
                  MIS 15 AÑOS
                </p>


                <h2
                  className="
                    font-script
                    mt-1
                    text-[3rem]
                    leading-none
                    text-[#765071]
                  "
                >
                  Fernanda
                </h2>

              </div>


              <p
                className="
                  mx-auto
                  mt-4
                  max-w-xs
                  text-sm
                  leading-6
                  text-[#80677b]
                "
              >
                Escanea este código para entrar y
                compartir tus fotos de esta noche.
              </p>


              {/* QR */}

              <div
                className="
                  mx-auto
                  mt-5
                  w-fit
                  rounded-[24px]
                  bg-white
                  p-4
                  shadow-lg
                "
              >

                <img
                  src="/design/qr-fernanda.png"
                  alt="Código QR de los 15 años de Fernanda"
                  className="
                    h-[250px]
                    w-[250px]
                    object-contain
                  "
                />

              </div>


              <p
                className="
                  mt-3
                  text-xs
                  text-[#92798c]
                "
              >
                fernanda-mis15.vercel.app
              </p>


              {/* COMPARTIR */}

              <button
                type="button"
                onClick={
                  () =>
                    void shareAccess()
                }
                className="
                  mt-5
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

          </div>,

          document.body

        )
      }

    </>

  );

}