"use client";

import {
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


function getErrorMessage(
  error: unknown
) {

  if (
    error instanceof Error
  ) {

    return error.message;

  }

  if (
    typeof error === "string"
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
    useState("");


  const [
    working,
    setWorking
  ] =
    useState(false);


  async function handleFiles(
    files:
      FileList | null
  ) {

    if (
      !files ||
      files.length === 0
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
        index < selected.length;
        index += 1
      ) {

        const file =
          selected[index];


        /*
         * ===============================================
         * PASO 1: PREPARAR IMAGEN
         * ===============================================
         */

        setStatus(
          `Preparando ${index + 1} de ${selected.length}...`
        );


        let prepared:
          File;


        try {

          prepared =
            await prepareImage(
              file
            );

        } catch (
          error
        ) {

          const detail =
            getErrorMessage(
              error
            );


          console.error(
            "Error en prepareImage:",
            error
          );


          throw new Error(
            `PREPARACIÓN: ${detail}`
          );

        }


        /*
         * ===============================================
         * PASO 2: GUARDAR EN COLA
         * ===============================================
         */

        setStatus(
          `Guardando ${index + 1} de ${selected.length}...`
        );


        try {

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

        } catch (
          error
        ) {

          const detail =
            getErrorMessage(
              error
            );


          console.error(
            "Error guardando en cola:",
            error
          );


          throw new Error(
            `COLA OFFLINE: ${detail}`
          );

        }

      }


      /*
       * ===============================================
       * PASO 3: SUBIR
       * ===============================================
       */

      if (
        navigator.onLine
      ) {

        setStatus(
          "Subiendo fotografías..."
        );


        try {

          await processQueue();

        } catch (
          error
        ) {

          const detail =
            getErrorMessage(
              error
            );


          console.error(
            "Error procesando cola:",
            error
          );


          throw new Error(
            `SUBIDA: ${detail}`
          );

        }


        setStatus(
          "¡Listo! Tus recuerdos fueron compartidos."
        );

      } else {

        setStatus(
          "Sin conexión. Las fotos quedaron guardadas y se subirán automáticamente cuando vuelva internet."
        );

      }


    } catch (
      error
    ) {

      const detail =
        getErrorMessage(
          error
        );


      console.error(
        "Error en flujo de fotografías:",
        error
      );


      setStatus(
        `No se pudo completar el proceso. ${detail}`
      );


    } finally {

      setWorking(
        false
      );


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

          <p
            className="
              mt-4
              rounded-2xl
              bg-white/55
              px-4
              py-3
              text-xs
              leading-5
              text-[#765f72]
            "
          >
            {status}
          </p>

        )
      }

    </div>

  );

}