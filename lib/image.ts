"use client";

import imageCompression
  from "browser-image-compression";


function isHeic(
  file: File
) {

  const name =
    file.name
      .toLowerCase();


  return (

    file.type ===
      "image/heic" ||

    file.type ===
      "image/heif" ||

    name.endsWith(
      ".heic"
    ) ||

    name.endsWith(
      ".heif"
    )

  );

}



async function convertHeic(
  file: File
) {

  if (!isHeic(file)) {

    return file;

  }


  const heic2any =
    (
      await import(
        "heic2any"
      )
    ).default;


  const result =
    await heic2any({

      blob:
        file,

      toType:
        "image/jpeg",

      quality:
        0.9

    });


  const blob =
    Array.isArray(result)
      ? result[0]
      : result;


  return new File(

    [
      blob
    ],

    `${crypto.randomUUID()}.jpg`,

    {

      type:
        "image/jpeg",

      lastModified:
        Date.now()

    }

  );

}



export async function preparePhoto(
  original: File
) {

  if (
    !original.type
      .startsWith(
        "image/"
      ) &&

    !isHeic(
      original
    )
  ) {

    throw new Error(
      "El archivo no es una imagen."
    );

  }


  if (
    original.size >
    30 * 1024 * 1024
  ) {

    throw new Error(
      "La imagen supera 30 MB."
    );

  }


  const normalized =
    await convertHeic(
      original
    );


  const compressed =
    await imageCompression(

      normalized,

      {

        maxSizeMB:
          0.55,

        maxWidthOrHeight:
          1920,

        useWebWorker:
          true,

        fileType:
          "image/jpeg",

        initialQuality:
          0.88,

        preserveExif:
          false

      }

    );


  return new File(

    [
      compressed
    ],

    `${crypto.randomUUID()}.jpg`,

    {

      type:
        "image/jpeg",

      lastModified:
        Date.now()

    }

  );

}