"use client";

import {
  useRef,
  useState
} from "react";

import {
  Music,
  Pause
} from "lucide-react";

import {
  eventConfig
} from "@/lib/event-config";


export default function MusicButton() {

  const audioRef =
    useRef<HTMLAudioElement>(
      null
    );


  const [
    playing,
    setPlaying
  ] =
    useState(false);


  if (
    !eventConfig.musicUrl
  ) {

    return null;

  }


  async function toggle() {

    if (
      !audioRef.current
    ) {

      return;

    }


    if (playing) {

      audioRef.current
        .pause();


      setPlaying(
        false
      );

    } else {

      await audioRef.current
        .play();


      setPlaying(
        true
      );

    }

  }


  return (

    <>

      <audio
        ref={audioRef}
        src={
          eventConfig.musicUrl
        }
        loop
        preload="none"
      />


      <button
        type="button"
        onClick={
          () =>
            void toggle()
        }
        className="
          fixed
          bottom-4
          right-4
          z-40
          flex
          min-h-12
          items-center
          gap-2
          rounded-full
          bg-white/95
          px-4
          text-sm
          font-semibold
          text-[#65445f]
          shadow-xl
        "
      >

        {
          playing

            ? <Pause />

            : <Music />
        }


        {
          playing

            ? "Pausar"

            : "Música"
        }

      </button>

    </>

  );

}