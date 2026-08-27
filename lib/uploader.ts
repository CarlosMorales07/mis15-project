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

    blob:
      Blob;

    filename:
      string;
  }
) {

  const token =
    await getAccessToken();


  /*
   * 1. Pedimos firma
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


  if (!signed.ok) {

    throw new Error(
      "No se pudo autorizar la subida."
    );

  }


  const auth =
    await signed.json();



  /*
   * 2. Subimos DIRECTAMENTE
   * navegador → Cloudinary
   */

  const form =
    new FormData();


  form.append(
    "file",
    item.blob,
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


  if (!cloud.ok) {

    throw new Error(
      "Cloudinary rechazó la fotografía."
    );

  }


  const cloudResult =
    await cloud.json();



  /*
   * 3. Confirmamos
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


  if (!confirmed.ok) {

    throw new Error(
      "No se pudo registrar la fotografía."
    );

  }


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
        error
      );


      break;

    }

  }

}