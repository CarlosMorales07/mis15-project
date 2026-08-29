"use client";

import {
  useEffect,
  useRef,
  useState
} from "react";

import {
  Camera,
  Images
} from "lucide-react";

import {
  eventConfig
} from "@/lib/event-config";

import {
  prepareImage
} from "@/lib/image";

import {
  queueAdd
} from "@/lib/queue";

import {
  processQueue
} from "@/lib/uploader";

import type {
  UploadProgressDetail
} from "@/lib/uploader";


type StatusKind =
  | "info"
  | "success"
  | "offline"
  | "error";


type StatusState = {

  text:
    string;

  kind:
    StatusKind;

} | null;


function getErrorMessage(
  error: unknown
) {

  if (
    error instanceof Error
  ) {

    return error.message;

  }


  if (
    typeof error ===
    "string"
  ) {

    return error;

  }


  return "Error desconocido";

}


export default function UploadPanel() {

  const cameraInputRef =
    useRef<HTMLInputElement | null>(
      null
    );


  const galleryInputRef =
    useRef<HTMLInputElement | null>(
      null
    );


  const [
    status,
    setStatus
  ] =
    useState<StatusState>(
      null
    );


  const [
    working,
    setWorking
  ] =
    useState(false);


  /*
   * =======================================================
   * ESCUCHAR PROGRESO GLOBAL
   * =======================================================
   *
   * También funciona cuando las fotos se
   * vuelven a subir después de recuperar internet.
   */

  useEffect(
    () => {

      function handleProgress(
        event: Event
      ) {

        const customEvent =
          event as CustomEvent<
            UploadProgressDetail
          >;


        const detail =
          customEvent.detail;


        if (
          detail.status ===
          "start"
        ) {

          setWorking(
            true
          );


          setStatus({

            kind:
              "info",

            text:
              detail.total === 1
                ? "Compartiendo tu fotografía..."
                : `Compartiendo 0 de ${detail.total} fotografías...`

          });


          return;

        }


        if (
          detail.status ===
          "progress"
        ) {

          setWorking(
            true
          );


          setStatus({

            kind:
              "info",

            text:
              detail.total === 1
                ? "Compartiendo tu fotografía..."
                : `Compartiendo ${detail.current} de ${detail.total} fotografías...`

          });


          return;

        }


        if (
          detail.status ===
          "completed"
        ) {

          setWorking(
            false
          );


          setStatus({

            kind:
              "success",

            text:
              detail.total === 1
                ? "✨ ¡Listo! Tu recuerdo fue compartido."
                : `✨ ¡Listo! ${detail.total} recuerdos fueron compartidos.`

          });


          return;

        }


        if (
          detail.status ===
          "pending"
        ) {

          setWorking(
            false
          );


          if (
            detail.pending >
            0
          ) {

            setStatus({

              kind:
                "offline",

              text:
                detail.pending === 1
                  ? "Tu foto quedó guardada. Se compartirá automáticamente cuando vuelva la conexión."
                  : `Tus ${detail.pending} fotos quedaron guardadas. Se compartirán automáticamente cuando vuelva la conexión.`

            });

          }

        }

      }


      window.addEventListener(
        "mis15:upload-progress",
        handleProgress
      );


      return () => {

        window.removeEventListener(
          "mis15:upload-progress",
          handleProgress
        );

      };

    },
    []
  );


  /*
   * =======================================================
   * OCULTAR MENSAJE DE ÉXITO
   * =======================================================
   */

  useEffect(
    () => {

      if (
        status?.kind !==
        "success"
      ) {

        return;

      }


      const timeout =
        window.setTimeout(
          () => {

            setStatus(
              null
            );

          },
          7000
        );


      return () => {

        window.clearTimeout(
          timeout
        );

      };

    },
    [
      status
    ]
  );


  /*
   * =======================================================
   * ARCHIVOS
   * =======================================================
   */

  async function handleFiles(
    files:
      FileList | null
  ) {

    if (
      !files ||
      files.length ===
        0
    ) {

      return;

    }


    const selected =
      Array.from(
        files
      ).slice(
        0,
        eventConfig.maxFilesPerSelection
      );


    setWorking(
      true
    );


    try {

      for (
        let index = 0;
        index <
          selected.length;
        index += 1
      ) {

        const file =
          selected[
            index
          ];


        setStatus({

          kind:
            "info",

          text:
            selected.length === 1
              ? "Preparando fotografía..."
              : `Preparando ${index + 1} de ${selected.length} fotografías...`

        });


        const prepared =
          await prepareImage(
            file
          );


        await queueAdd({

          id:
            crypto.randomUUID(),

          blob:
            prepared,

          filename:
            prepared.name,

          createdAt:
            Date.now()

        });

      }


      /*
       * Sin conexión:
       * quedan en IndexedDB.
       */

      if (
        !navigator.onLine
      ) {

        setWorking(
          false
        );


        setStatus({

          kind:
            "offline",

          text:
            selected.length === 1
              ? "Tu foto quedó guardada. Se compartirá automáticamente cuando vuelva la conexión."
              : `Tus ${selected.length} fotos quedaron guardadas. Se compartirán automáticamente cuando vuelva la conexión.`

        });


        return;

      }


      /*
       * processQueue enviará los
       * eventos reales de progreso.
       */

      await processQueue();


    } catch (
      error
    ) {

      console.error(
        "Error procesando fotografías:",
        error
      );


      setWorking(
        false
      );


      setStatus({

        kind:
          "error",

        text:
          `No se pudo preparar una fotografía. ${getErrorMessage(error)}`

      });


    } finally {

      if (
        cameraInputRef.current
      ) {

        cameraInputRef.current.value =
          "";

      }


      if (
        galleryInputRef.current
      ) {

        galleryInputRef.current.value =
          "";

      }

    }

  }


  return (

    <div
      className="
        w-full
        text-center
      "
    >

      <h2
        className="
          font-title
          text-[1.65rem]
          font-semibold
          leading-tight
          text-[#5f435a]
          sm:text-[1.85rem]
        "
      >
        Comparte este momento conmigo
      </h2>


      <p
        className="
          mt-2
          text-sm
          leading-6
          text-[#80677b]
        "
      >
        Toma una foto o elige hasta{" "}
        {eventConfig.maxFilesPerSelection}{" "}
        de tu galería.
      </p>


      <input
        ref={
          cameraInputRef
        }
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={
          (
            event
          ) =>
            void handleFiles(
              event.target.files
            )
        }
      />


      <input
        ref={
          galleryInputRef
        }
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        className="hidden"
        onChange={
          (
            event
          ) =>
            void handleFiles(
              event.target.files
            )
        }
      />


      <div
        className="
          mt-5
          grid
          grid-cols-2
          gap-3
        "
      >

        <button
          type="button"
          disabled={
            working
          }
          onClick={
            () =>
              cameraInputRef.current?.click()
          }
          className="
            flex
            min-h-14
            items-center
            justify-center
            gap-2
            rounded-2xl
            bg-[#765071]
            px-4
            font-semibold
            text-white
            shadow-[0_8px_20px_rgba(118,80,113,0.22)]
            transition-all
            duration-200
            hover:scale-[1.03]
            hover:bg-[#5f3e5b]
            active:scale-[0.98]
            disabled:cursor-not-allowed
            disabled:opacity-55
          "
        >

          <Camera
            size={21}
          />

          Tomar foto

        </button>


        <button
          type="button"
          disabled={
            working
          }
          onClick={
            () =>
              galleryInputRef.current?.click()
          }
          className="
            flex
            min-h-14
            items-center
            justify-center
            gap-2
            rounded-2xl
            bg-[#c28ba2]
            px-4
            font-semibold
            text-white
            shadow-[0_8px_20px_rgba(194,139,162,0.20)]
            transition-all
            duration-200
            hover:scale-[1.03]
            hover:bg-[#ad748d]
            active:scale-[0.98]
            disabled:cursor-not-allowed
            disabled:opacity-55
          "
        >

          <Images
            size={21}
          />

          Galería

        </button>

      </div>


      {
        status && (

          <div
            className={`
              mt-4
              rounded-2xl
              border
              px-4
              py-3
              text-sm
              leading-6

              ${
                status.kind ===
                  "success"
                  ? "border-[#dbe9d5] bg-[#f0f7ed] text-[#55704f]"
                  : status.kind ===
                      "offline"
                    ? "border-[#ead9ba] bg-[#fff8e9] text-[#806333]"
                    : status.kind ===
                        "error"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-white/70 bg-white/55 text-[#765f72]"
              }
            `}
          >
            {status.text}
          </div>

        )
      }

    </div>

  );

}