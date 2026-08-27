"use client";

import {
  ChangeEvent,
  useEffect,
  useRef,
  useState
} from "react";

import {
  Camera,
  Images,
  CloudOff
} from "lucide-react";

import {
  preparePhoto
} from "@/lib/image";

import {
  queueAdd,
  queueCount
} from "@/lib/queue";

import {
  processQueue
} from "@/lib/uploader";

import {
  eventConfig
} from "@/lib/event-config";


export default function UploadPanel() {

  const cameraRef =
    useRef<HTMLInputElement>(
      null
    );


  const galleryRef =
    useRef<HTMLInputElement>(
      null
    );


  const [
    busy,
    setBusy
  ] =
    useState(false);


  const [
    pending,
    setPending
  ] =
    useState(0);


  const [
    status,
    setStatus
  ] =
    useState("");


  async function updateCount() {

    setPending(
      await queueCount()
    );

  }


  useEffect(
    () => {

      void updateCount();

    },
    []
  );


  async function selected(
    event:
      ChangeEvent<HTMLInputElement>
  ) {

    const files =
      Array.from(
        event.target.files ??
        []
      );


    event.target.value =
      "";


    if (!files.length) {

      return;

    }


    if (
      files.length >
      eventConfig
        .maxFilesPerSelection
    ) {

      setStatus(

        `Selecciona máximo ${
          eventConfig
            .maxFilesPerSelection
        } fotos.`

      );


      return;

    }


    setBusy(
      true
    );


    try {

      for (
        let i = 0;
        i <
        files.length;
        i++
      ) {

        setStatus(

          `Preparando ${
            i + 1
          } de ${
            files.length
          }…`

        );


        const photo =
          await preparePhoto(
            files[i]
          );


        const id =
          crypto.randomUUID();


        await queueAdd({

          id,

          blob:
            photo,

          filename:
            `${id}.jpg`,

          createdAt:
            Date.now() + i

        });

      }


      await updateCount();


      if (
        navigator.onLine
      ) {

        setStatus(
          "Compartiendo tus recuerdos…"
        );


        await processQueue();


        setStatus(
          "Tus recuerdos fueron compartidos ✨"
        );

      } else {

        setStatus(
          "Sin conexión. Tus fotografías están seguras y se compartirán automáticamente cuando vuelva internet."
        );

      }


      await updateCount();


    } catch (
      error
    ) {

      setStatus(

        error instanceof Error

          ? error.message

          : "Ocurrió un error."

      );


    } finally {

      setBusy(
        false
      );

    }

  }


  return (

    <section
      className="
        rounded-[28px]
        border
        border-white/80
        bg-white/85
        p-5
        shadow-xl
        backdrop-blur
      "
    >

      <h2
        className="
          text-center
          text-xl
          font-semibold
          text-[#543550]
        "
      >

        Comparte este momento conmigo

      </h2>


      <p
        className="
          mt-2
          text-center
          text-sm
          text-[#745c70]
        "
      >

        Toma una foto o elige hasta
        {" "}
        {
          eventConfig
            .maxFilesPerSelection
        }
        {" "}
        de tu galería.

      </p>


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
          disabled={busy}
          onClick={
            () =>
              cameraRef
                .current
                ?.click()
          }
          className="
            flex
            min-h-14
            items-center
            justify-center
            gap-2
            rounded-2xl
            bg-[#785078]
            px-4
            py-3
            font-semibold
            text-white
            shadow
            disabled:opacity-50
          "
        >

          <Camera
            size={20}
          />

          Tomar foto

        </button>


        <button
          type="button"
          disabled={busy}
          onClick={
            () =>
              galleryRef
                .current
                ?.click()
          }
          className="
            flex
            min-h-14
            items-center
            justify-center
            gap-2
            rounded-2xl
            bg-[#c08a9e]
            px-4
            py-3
            font-semibold
            text-white
            shadow
            disabled:opacity-50
          "
        >

          <Images
            size={20}
          />

          Galería

        </button>

      </div>


      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={selected}
      />


      <input
        ref={galleryRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        className="hidden"
        onChange={selected}
      />


      {
        status && (

          <div
            className="
              mt-4
              rounded-2xl
              bg-[#fff8f5]
              p-3
              text-sm
              text-[#6f5668]
            "
          >

            {
              !navigator.onLine && (

                <CloudOff
                  size={17}
                />

              )
            }


            <p>
              {status}
            </p>


            {
              pending > 0 && (

                <p
                  className="
                    mt-1
                    font-semibold
                  "
                >

                  {
                    pending
                  }
                  {" "}
                  fotografía(s) pendiente(s)

                </p>

              )
            }

          </div>

        )
      }

    </section>

  );

}