"use client";

import {
  getAccessToken
} from "@/lib/supabase";

import {
  queueAll,
  queueCount,
  queueDelete
} from "@/lib/queue";


export type ProcessQueueResult = {

  uploaded:
    number;

  pending:
    number;

};


export type UploadProgressDetail = {

  status:
    | "start"
    | "progress"
    | "completed"
    | "pending";

  current:
    number;

  total:
    number;

  pending:
    number;

};


/*
 * Evita que dos eventos diferentes
 * intenten procesar la misma cola
 * al mismo tiempo.
 */

let processingPromise:
  Promise<ProcessQueueResult> |
  null =
    null;


/* =========================================================
   EVENTOS DE PROGRESO
   ========================================================= */

function emitProgress(
  detail: UploadProgressDetail
) {

  if (
    typeof window ===
    "undefined"
  ) {

    return;

  }


  window.dispatchEvent(

    new CustomEvent<UploadProgressDetail>(
      "mis15:upload-progress",
      {
        detail
      }
    )

  );

}


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
        `${label} - intento ${attempt} de ${attempts}:`,
        error
      );


      if (
        attempt <
        attempts
      ) {

        await wait(
          Math.min(
            1000 *
            Math.pow(
              2,
              attempt - 1
            ),
            5000
          )
        );

      }

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


  /* 1. FIRMA */

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


  /* 2. RECONSTRUIR IMAGEN */

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


  /* 3. CLOUDINARY */

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

    throw new Error(
      "Cloudinary rechazó la fotografía."
    );

  }


  const cloudResult =
    await cloud.json();


  /* 4. SUPABASE */

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

    throw new Error(
      "No se pudo registrar la fotografía."
    );

  }


  /* 5. QUITAR DE COLA */

  await queueDelete(
    item.id
  );


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
   PROCESAMIENTO INTERNO
   ========================================================= */

async function runQueue():
  Promise<ProcessQueueResult> {

  const initialPending =
    await queueCount();


  if (
    typeof navigator !==
      "undefined" &&
    !navigator.onLine
  ) {

    emitProgress({

      status:
        "pending",

      current:
        0,

      total:
        initialPending,

      pending:
        initialPending

    });


    return {

      uploaded:
        0,

      pending:
        initialPending

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


  const total =
    items.length;


  if (
    total ===
    0
  ) {

    return {

      uploaded:
        0,

      pending:
        0

    };

  }


  emitProgress({

    status:
      "start",

    current:
      0,

    total,

    pending:
      total

  });


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


      const remaining =
        await queueCount();


      emitProgress({

        status:
          "progress",

        current:
          uploaded,

        total,

        pending:
          remaining

      });


    } catch (
      error
    ) {

      console.error(
        "La fotografía continuará pendiente:",
        error
      );


      break;

    }

  }


  const pending =
    await queueCount();


  if (
    pending ===
    0
  ) {

    emitProgress({

      status:
        "completed",

      current:
        uploaded,

      total,

      pending:
        0

    });

  } else {

    emitProgress({

      status:
        "pending",

      current:
        uploaded,

      total,

      pending

    });

  }


  return {

    uploaded,

    pending

  };

}


/* =========================================================
   FUNCIÓN PÚBLICA
   ========================================================= */

export async function processQueue():
  Promise<ProcessQueueResult> {

  /*
   * Si ya existe un procesamiento,
   * reutilizamos el mismo.
   */

  if (
    processingPromise
  ) {

    return processingPromise;

  }


  processingPromise =
    runQueue();


  try {

    return await processingPromise;

  } finally {

    processingPromise =
      null;

  }

}