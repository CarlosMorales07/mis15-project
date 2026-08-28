import {
  Sparkles
} from "lucide-react";

import Gallery
  from "@/components/Gallery";

import UploadPanel
  from "@/components/UploadPanel";

import {
  eventConfig
} from "@/lib/event-config";


export default function MemoriesPage() {

  return (

    <main
      className="
        relative
        min-h-screen
        min-h-[100dvh]
        px-3
        pb-20
        pt-4

        sm:px-6
        sm:pt-7

        lg:px-8
      "
    >

      <div
        className="
          mx-auto
          w-full
          max-w-7xl
        "
      >

        {/* =================================================
            BLOQUE SUPERIOR ÚNICO
        ================================================== */}

        <section
          className="
            event-glass
            mx-auto
            max-w-2xl
            overflow-hidden
            rounded-[34px]
            px-5
            py-7

            sm:px-8
            sm:py-9
          "
        >

          {/* ===============================================
              IDENTIDAD DEL EVENTO
          ================================================ */}

          <header
            className="
              text-center
            "
          >

            <div
              className="
                mx-auto
                flex
                h-9
                w-9
                items-center
                justify-center
                text-[#b38136]
              "
            >

              <Sparkles
                size={24}
                strokeWidth={1.6}
              />

            </div>


            <p
              className="
                font-title
                mt-1
                text-[0.95rem]
                font-semibold
                uppercase
                tracking-[0.28em]
                text-[#ad7c3d]

                sm:text-base
              "
            >
              Mis 15 Años
            </p>


            <h1
              className="
                font-script
                mt-1
                text-[4.2rem]
                font-normal
                leading-none
                text-[#765071]

                sm:text-[5.2rem]
              "
            >
              {eventConfig.name}
            </h1>


            <p
              className="
                mx-auto
                mt-4
                max-w-xl
                text-sm
                leading-6
                text-[#70586c]

                sm:text-base
                sm:leading-7
              "
            >

              {eventConfig.introLine1}

              <br />

              <strong
                className="
                  font-semibold
                  text-[#5f435a]
                "
              >
                {eventConfig.introLine2}
              </strong>

            </p>

          </header>


          {/* ===============================================
              DIVISOR
          ================================================ */}

          <div
            className="
              mx-auto
              my-6
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


          {/* ===============================================
              SUBIR FOTOS
          ================================================ */}

          <UploadPanel />


          {/* ===============================================
              PRIVACIDAD
          ================================================ */}

          <div
            className="
              mx-auto
              mt-6
              h-px
              max-w-sm
              bg-gradient-to-r
              from-transparent
              via-[#d8c2d5]
              to-transparent
            "
          />


          <p
            className="
              mx-auto
              mt-4
              max-w-xl
              px-2
              text-center
              text-[10px]
              leading-5
              text-[#80677b]

              sm:text-xs
            "
          >
            {eventConfig.privacyText}
          </p>

        </section>


        {/* =================================================
            GALERÍA
        ================================================== */}

        <section
          className="
            event-glass
            mt-6
            rounded-[32px]
            p-3

            sm:mt-8
            sm:p-5

            lg:p-6
          "
        >

          <Gallery />

        </section>

      </div>

    </main>

  );

}