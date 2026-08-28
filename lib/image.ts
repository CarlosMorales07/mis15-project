import imageCompression
  from "browser-image-compression";


/*
 * =========================================================
 * CONFIGURACIÓN
 * =========================================================
 */

const MAX_ORIGINAL_SIZE_MB =
  30;


const MAX_COMPRESSED_SIZE_MB =
  0.55;


const MAX_DIMENSION =
  1920;


/*
 * =========================================================
 * DETECTAR HEIC / HEIF
 * =========================================================
 */


function isHeicFile(
  file: File
) {

  const type =
    file.type
      .toLowerCase();


  const name =
    file.name
      .toLowerCase();


  return (

    type ===
      "image/heic" ||

    type ===
      "image/heif" ||

    name.endsWith(
      ".heic"
    ) ||

    name.endsWith(
      ".heif"
    )

  );

}


/*
 * =========================================================
 * CONVERTIR HEIC → JPEG
 * =========================================================
 */


async function convertHeicToJpeg(
  file: File
): Promise<File> {

  const heic2anyModule =
    await import(
      "heic2any"
    );


  const heic2any =
    heic2anyModule.default;


  const result =
    await heic2any({

      blob:
        file,

      toType:
        "image/jpeg",

      quality:
        0.9

    });


  /*
   * heic2any puede devolver
   * Blob o Blob[].
   */

  const convertedBlob =
    Array.isArray(
      result
    )

      ? result[0]

      : result;


  if (
    !convertedBlob
  ) {

    throw new Error(
      "No se pudo convertir la fotografía HEIC."
    );

  }


  const originalName =
    file.name.replace(
      /\.(heic|heif)$/i,
      ""
    );


  return new File(

    [
      convertedBlob
    ],

    `${originalName}.jpg`,

    {
      type:
        "image/jpeg",

      lastModified:
        Date.now()
    }

  );

}


/*
 * =========================================================
 * PREPARAR IMAGEN
 * =========================================================
 *
 * Esta es la función que utiliza UploadPanel.tsx
 *
 * Flujo:
 *
 * Foto original
 * ↓
 * validar tamaño
 * ↓
 * HEIC → JPEG si hace falta
 * ↓
 * comprimir
 * ↓
 * máximo 1920 px
 * ↓
 * aproximadamente 550 KB
 * ↓
 * eliminar EXIF
 * ↓
 * devolver File listo para subir
 */


export async function prepareImage(
  originalFile: File
): Promise<File> {

  /*
   * =====================================================
   * 1. VALIDAR QUE SEA IMAGEN
   * =====================================================
   */

  if (
    !originalFile.type
      .startsWith(
        "image/"
      ) &&
    !isHeicFile(
      originalFile
    )
  ) {

    throw new Error(
      "El archivo seleccionado no es una imagen válida."
    );

  }


  /*
   * =====================================================
   * 2. VALIDAR TAMAÑO ORIGINAL
   * =====================================================
   */

  const originalSizeMb =
    originalFile.size /
    (
      1024 *
      1024
    );


  if (
    originalSizeMb >
    MAX_ORIGINAL_SIZE_MB
  ) {

    throw new Error(
      `La fotografía supera el límite de ${MAX_ORIGINAL_SIZE_MB} MB.`
    );

  }


  /*
   * =====================================================
   * 3. CONVERTIR HEIC
   * =====================================================
   */

  let workingFile =
    originalFile;


  if (
    isHeicFile(
      originalFile
    )
  ) {

    workingFile =
      await convertHeicToJpeg(
        originalFile
      );

  }


  /*
   * =====================================================
   * 4. COMPRIMIR
   * =====================================================
   */

  const compressedBlob =
    await imageCompression(

      workingFile,

      {

        maxSizeMB:
          MAX_COMPRESSED_SIZE_MB,

        maxWidthOrHeight:
          MAX_DIMENSION,

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


  /*
   * =====================================================
   * 5. CREAR NOMBRE FINAL
   * =====================================================
   */

  const nameWithoutExtension =
    workingFile.name.replace(
      /\.[^.]+$/,
      ""
    );


  /*
   * browser-image-compression normalmente
   * devuelve File, pero construimos uno nuevo
   * para garantizar nombre y MIME.
   */

  const finalFile =
    new File(

      [
        compressedBlob
      ],

      `${nameWithoutExtension}.jpg`,

      {

        type:
          "image/jpeg",

        lastModified:
          Date.now()

      }

    );


  return finalFile;

}