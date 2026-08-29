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

        const previousBehavior =
          html.style.scrollBehavior;


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
            "Comparte tus fotos de los 15 años de Fernanda.",

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
        () =>
          setCopied(
            false
          ),
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

      <button
        type="button"
        onClick={
          () =>
            setOpen(
              true
            )
        }
        className="
          inline-flex
          min-h-10
          items-center
          justify-center
          gap-2
          rounded-full
          border
          border-[#d8c2d5]
          bg-white/55
          px-4
          text-xs
          font-semibold
          text-[#765071]
          shadow-sm
          backdrop-blur
          transition-all
          duration-200
          hover:bg-white/80
        "
      >

        <QrCode
          size={17}
        />

        Mostrar QR

      </button>


      {
        open &&
        createPortal(

          <div
            className="
              fixed
              inset-0
              z-[12000]
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
                p-6
                text-center
                shadow-2xl
              "
            >

              <button
                type="button"
                onClick={
                  () =>
                    setOpen(
                      false
                    )
                }
                className="
                  absolute
                  right-4
                  top-4
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-full
                  bg-[#eee4f2]
                  text-[#765071]
                "
              >

                <X
                  size={21}
                />

              </button>


              <p
                className="
                  font-title
                  text-lg
                  font-semibold
                  tracking-[0.18em]
                  text-[#ad7c3d]
                "
              >
                MIS 15 AÑOS
              </p>


              <h2
                className="
                  font-script
                  mt-1
                  text-[3.7rem]
                  font-normal
                  leading-none
                  text-[#765071]
                "
              >
                Fernanda
              </h2>


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
                Escanea el código para compartir tus fotos
                y disfrutar los recuerdos de esta noche.
              </p>


              <div
                className="
                  mx-auto
                  mt-5
                  w-fit
                  rounded-[26px]
                  bg-white
                  p-4
                  shadow-lg
                "
              >

                <img
                  src="/design/qr-fernanda.png"
                  alt="Código QR para acceder a Mis 15 Años de Fernanda"
                  className="
                    h-[220px]
                    w-[220px]
                    object-contain
                  "
                />

              </div>


              <p
                className="
                  mt-4
                  break-all
                  text-xs
                  text-[#92798c]
                "
              >
                fernanda-mis15.vercel.app
              </p>


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

                        Compartir acceso
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