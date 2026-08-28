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

      /* =================================================
         PREPARAR CADA FOTO
         ================================================= */

      for (
        let index = 0;
        index < selected.length;
        index += 1
      ) {

        const file =
          selected[index];


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

          console.error(
            "Error preparando imagen:",
            error
          );


          throw new Error(
            `No se pudo preparar la fotografía. ${getErrorMessage(error)}`
          );

        }


        /* ===============================================
           GUARDAR EN COLA SEGURA
           =============================================== */

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

          console.error(
            "Error guardando fotografía:",
            error
          );


          throw new Error(
            `No se pudo guardar temporalmente la fotografía. ${getErrorMessage(error)}`
          );

        }

      }



      /* =================================================
         SIN INTERNET
         ================================================= */

      if (
        !navigator.onLine
      ) {

        setStatus(
          selected.length === 1
            ? "Tu foto quedó guardada. Se compartirá automáticamente cuando vuelva la conexión."
            : "Tus fotos quedaron guardadas. Se compartirán automáticamente cuando vuelva la conexión."
        );


        return;

      }



      /* =================================================
         INTENTAR SUBIR
         ================================================= */

      setStatus(
        selected.length === 1
          ? "Subiendo fotografía..."
          : "Subiendo fotografías..."
      );


      const result =
        await processQueue();



      /* =================================================
         TODO SUBIDO
         ================================================= */

      if (
        result.pending === 0
      ) {

        setStatus(
          selected.length === 1
            ? "✨ ¡Listo! Tu recuerdo fue compartido."
            : "✨ ¡Listo! Tus recuerdos fueron compartidos."
        );


        return;

      }



      /* =================================================
         ALGUNAS QUEDARON PENDIENTES
         ================================================= */

      if (
        result.uploaded >
        0
      ) {

        setStatus(
          "✨ Algunas fotos ya se compartieron. Las restantes quedaron guardadas y la app volverá a intentarlo automáticamente."
        );


        return;

      }



      /* =================================================
         CONEXIÓN INESTABLE
         ================================================= */

      setStatus(
        selected.length === 1
          ? "Tu foto quedó guardada. La conexión está inestable y volveremos a intentar subirla automáticamente."
          : "Tus fotos quedaron guardadas. La conexión está inestable y volveremos a intentar subirlas automáticamente."
      );


    } catch (
      error
    ) {

      const detail =
        getErrorMessage(
          error
        );


      console.error(
        "Error procesando fotografías:",
        error
      );


      setStatus(
        detail
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

      {/* TÍTULO */}

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


      {/* SUBTÍTULO */}

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


      {/* CÁMARA */}

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


      {/* GALERÍA */}

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


      {/* BOTONES */}

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


      {/* ESTADO */}

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