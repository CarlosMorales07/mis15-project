"use client";

import {
  getAccessToken
} from "@/lib/supabase";

import {
  queueAll,
  queueDelete
} from "@/lib/queue";


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


  /*
   * =====================================================
   * 1. PEDIR FIRMA
   * =====================================================
   */

  const signed =
    await fetch(

      "/api/cloudinary/sign",

      {

        method:
          "POST",

        headers: {

          Authorization:
            `Bearer ${token}`

        }

      }

    );


  if (
    !signed.ok
  ) {

    throw new Error(
      "No se pudo autorizar la subida."
    );

  }


  const auth =
    await signed.json();



  /*
   * =====================================================
   * 2. RECONSTRUIR BLOB
   * =====================================================
   *
   * IndexedDB guarda ArrayBuffer.
   * Antes de subirlo reconstruimos el Blob.
   */

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



  /*
   * =====================================================
   * 3. SUBIR DIRECTAMENTE A CLOUDINARY
   * =====================================================
   */

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
    await fetch(

      `https://api.cloudinary.com/v1_1/${auth.cloudName}/image/upload`,

      {

        method:
          "POST",

        body:
          form

      }

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
      "Cloudinary error:",
      cloudError
    );


    throw new Error(
      "Cloudinary rechazó la fotografía."
    );

  }


  const cloudResult =
    await cloud.json();



  /*
   * =====================================================
   * 4. CONFIRMAR EN SUPABASE
   * =====================================================
   */

  const confirmed =
    await fetch(

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

      }

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
      "Confirm error:",
      confirmError
    );


    throw new Error(
      "No se pudo registrar la fotografía."
    );

  }


  /*
   * =====================================================
   * 5. BORRAR DE LA COLA
   * =====================================================
   */

  await queueDelete(
    item.id
  );


  /*
   * =====================================================
   * 6. ACTUALIZAR UI
   * =====================================================
   */

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



export async function processQueue() {

  if (
    typeof navigator !==
      "undefined" &&

    !navigator.onLine
  ) {

    return;

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


  for (
    const item of items
  ) {

    try {

      await uploadOne(
        item
      );

    } catch (
      error
    ) {

      console.error(
        "Error procesando fotografía:",
        error
      );


      throw error;

    }

  }

}