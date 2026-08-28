"use client";

import {
  getAccessToken
} from "@/lib/supabase";

import {
  queueAll,
  queueCount,
  queueDelete
} from "@/lib/queue";


/* =========================================================
   TIPOS
   ========================================================= */

export type ProcessQueueResult = {

  uploaded:
    number;

  pending:
    number;

};


/* =========================================================
   ESPERA
   ========================================================= */

function wait(
  milliseconds: number
) {

  return new Promise<void>(
    (
      resolve
    ) => {

      window.setTimeout(
        resolve,
        milliseconds
      );

    }
  );

}


/* =========================================================
   FETCH CON REINTENTOS
   ========================================================= */

async function fetchWithRetry(

  input:
    RequestInfo | URL,

  init:
    RequestInit,

  label:
    string,

  attempts =
    4

): Promise<Response> {

  let lastError:
    unknown;


  for (
    let attempt = 1;
    attempt <= attempts;
    attempt += 1
  ) {

    try {

      const response =
        await fetch(
          input,
          init
        );


      /*
       * Errores temporales del servidor.
       * En estos casos sí vale la pena reintentar.
       */

      if (
        response.status === 408 ||
        response.status === 429 ||
        response.status >= 500
      ) {

        throw new Error(
          `${label}: HTTP ${response.status}`
        );

      }


      return response;


    } catch (
      error
    ) {

      lastError =
        error;


      console.warn(
        `${label} - intento ${attempt} de ${attempts} falló:`,
        error
      );


      if (
        attempt === attempts
      ) {

        break;

      }


      /*
       * Esperas progresivas:
       *
       * intento 1 → 1 segundo
       * intento 2 → 2 segundos
       * intento 3 → 4 segundos
       */

      const delay =
        Math.min(
          1000 *
          Math.pow(
            2,
            attempt - 1
          ),
          5000
        );


      await wait(
        delay
      );

    }

  }


  if (
    lastError instanceof Error
  ) {

    throw lastError;

  }


  throw new Error(
    `${label}: no fue posible completar la solicitud.`
  );

}


/* =========================================================
   SUBIR UNA FOTOGRAFÍA
   ========================================================= */

async function uploadOne(
  item: {

    id:
      string;

    buffer:
      ArrayBuffer;

    mimeType:
      string;

    filename:
      string;

  }
) {

  const token =
    await getAccessToken();


  /* =====================================================
     1. PEDIR FIRMA
     ===================================================== */

  const signed =
    await fetchWithRetry(

      "/api/cloudinary/sign",

      {

        method:
          "POST",

        headers: {

          Authorization:
            `Bearer ${token}`

        }

      },

      "Firma de subida"

    );


  if (
    !signed.ok
  ) {

    throw new Error(
      "No se pudo autorizar la fotografía."
    );

  }


  const auth =
    await signed.json();



  /* =====================================================
     2. RECONSTRUIR BLOB
     ===================================================== */

  const blob =
    new Blob(

      [
        item.buffer
      ],

      {

        type:
          item.mimeType ||
          "image/jpeg"

      }

    );



  /* =====================================================
     3. PREPARAR FORMULARIO CLOUDINARY
     ===================================================== */

  const form =
    new FormData();


  form.append(
    "file",
    blob,
    item.filename
  );


  form.append(
    "api_key",
    auth.apiKey
  );


  form.append(
    "timestamp",
    String(
      auth.timestamp
    )
  );


  form.append(
    "signature",
    auth.signature
  );


  form.append(
    "public_id",
    auth.publicId
  );



  /* =====================================================
     4. SUBIR A CLOUDINARY
     ===================================================== */

  const cloud =
    await fetchWithRetry(

      `https://api.cloudinary.com/v1_1/${auth.cloudName}/image/upload`,

      {

        method:
          "POST",

        body:
          form

      },

      "Cloudinary"

    );


  if (
    !cloud.ok
  ) {

    const cloudError =
      await cloud
        .text()
        .catch(
          () => ""
        );


    console.error(
      "Cloudinary rechazó la fotografía:",
      cloudError
    );


    throw new Error(
      "Cloudinary rechazó la fotografía."
    );

  }


  const cloudResult =
    await cloud.json();



  /* =====================================================
     5. REGISTRAR EN SUPABASE
     ===================================================== */

  const confirmed =
    await fetchWithRetry(

      "/api/photos/confirm",

      {

        method:
          "POST",

        headers: {

          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`

        },

        body:
          JSON.stringify({

            ticket:
              auth.ticket,

            publicId:
              cloudResult.public_id

          })

      },

      "Registro de fotografía"

    );


  if (
    !confirmed.ok
  ) {

    const confirmError =
      await confirmed
        .text()
        .catch(
          () => ""
        );


    console.error(
      "Error registrando fotografía:",
      confirmError
    );


    throw new Error(
      "No se pudo registrar la fotografía."
    );

  }



  /* =====================================================
     6. ELIMINAR DE LA COLA
     ===================================================== */

  await queueDelete(
    item.id
  );



  /* =====================================================
     7. ACTUALIZAR INTERFAZ
     ===================================================== */

  window.dispatchEvent(

    new CustomEvent(
      "mis15:queue-changed"
    )

  );


  window.dispatchEvent(

    new CustomEvent(
      "mis15:gallery-refresh"
    )

  );

}


/* =========================================================
   PROCESAR COLA
   ========================================================= */

export async function processQueue():
  Promise<ProcessQueueResult> {

  /*
   * Sin internet no intentamos subir.
   * Las fotos permanecen almacenadas.
   */

  if (
    typeof navigator !==
      "undefined" &&
    !navigator.onLine
  ) {

    return {

      uploaded:
        0,

      pending:
        await queueCount()

    };

  }


  const items =
    (
      await queueAll()
    )
      .sort(

        (
          a,
          b
        ) =>
          a.createdAt -
          b.createdAt

      );


  let uploaded =
    0;


  for (
    const item of items
  ) {

    try {

      await uploadOne(
        item
      );


      uploaded +=
        1;


    } catch (
      error
    ) {

      /*
       * MUY IMPORTANTE:
       *
       * No eliminamos la fotografía.
       *
       * Sigue almacenada en IndexedDB
       * para poder reintentar después.
       */

      console.error(
        "La fotografía continuará pendiente:",
        error
      );


      break;

    }

  }


  const pending =
    await queueCount();


  return {

    uploaded,

    pending

  };

}