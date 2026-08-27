"use client";

import {
  useEffect
} from "react";

import {
  processQueue
} from "@/lib/uploader";


export default function PwaBoot() {

  useEffect(
    () => {

      if (
        "serviceWorker"
        in navigator
      ) {

        navigator
          .serviceWorker
          .register(
            "/sw.js"
          )
          .catch(
            console.error
          );

      }


      const synchronize =
        () => {

          void processQueue();

        };


      window.addEventListener(

        "online",

        synchronize

      );


      /*
       * También intentamos
       * sincronizar cuando
       * vuelve a abrir la app.
       */

      void processQueue();


      return () => {

        window.removeEventListener(

          "online",

          synchronize

        );

      };

    },

    []

  );


  return null;

}