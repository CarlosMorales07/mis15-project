import UploadPanel
  from "@/components/UploadPanel";

import Gallery
  from "@/components/Gallery";

import {
  eventConfig
} from "@/lib/event-config";


export default function MemoriesPage() {

  return (

    <main
      className="
        mx-auto
        min-h-screen
        max-w-7xl
        px-3
        pb-20
        pt-7
        sm:px-6
      "
    >

      <header
        className="
          mx-auto
          mb-7
          max-w-2xl
          text-center
        "
      >

        <p
          className="
            text-xs
            font-semibold
            tracking-[0.28em]
            text-[#ad7c3d]
          "
        >
          MIS 15 AÑOS
        </p>


        <h1
          className="
            mt-2
            text-4xl
            font-light
            italic
            text-[#765071]
          "
        >
          {eventConfig.name}
        </h1>


        <p
          className="
            mx-auto
            mt-4
            max-w-xl
            text-base
            leading-7
            text-[#70586c]
          "
        >

          {eventConfig.introLine1}

          <br />

          <strong>
            {eventConfig.introLine2}
          </strong>

        </p>

      </header>


      <div
        className="
          mx-auto
          max-w-2xl
        "
      >

        <UploadPanel />


        <p
          className="
            mt-3
            px-3
            text-center
            text-xs
            leading-5
            text-[#8b7284]
          "
        >
          {eventConfig.privacyText}
        </p>

      </div>


      <Gallery />

    </main>

  );

}