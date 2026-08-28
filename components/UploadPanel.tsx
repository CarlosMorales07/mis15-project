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


    setStatus(
      `Preparando ${selected.length} ${
        selected.length === 1
          ? "foto"
          : "fotos"
      }...`
    );


    try {

      let preparedCount =
        0;


      for (
        const file of
        selected
      ) {

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


        preparedCount +=
          1;


        setStatus(
          `Preparando ${preparedCount} de ${selected.length}...`
        );

      }


      if (
        navigator.onLine
      ) {

        setStatus(
          "Compartiendo recuerdos..."
        );


        await processQueue();


        setStatus(
          "¡Listo! Tus recuerdos se están mostrando en la galería."
        );

      } else {

        setStatus(
          "Sin conexión. Las fotos quedaron guardadas y se subirán automáticamente cuando vuelva internet."
        );

      }


    } catch (
      error
    ) {

      console.error(
        "Error preparando fotografías:",
        error
      );


      setStatus(
        "No pudimos preparar una de las fotografías. Inténtalo nuevamente."
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
        Toma una foto o elige hasta
        {" "}
        {eventConfig.maxFilesPerSelection}
        {" "}
        de tu galería.
      </p>


      {/* INPUT CÁMARA */}

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


      {/* INPUT GALERÍA */}

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
            disabled:hover:scale-100
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
            disabled:hover:scale-100
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
              bg-white/45
              px-3
              py-2
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