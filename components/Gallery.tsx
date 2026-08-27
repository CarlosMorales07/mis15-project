"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  Images,
  Star,
  Trash2,
  X
} from "lucide-react";

import {
  ensureAnonymousSession,
  getAccessToken,
  getSupabaseBrowser
} from "@/lib/supabase";

import type {
  Photo
} from "@/lib/types";


type GalleryTab =
  | "all"
  | "favorites"
  | "mine";


type FavoriteRow = {
  photo_id: string | null;
};


type DownloadStatus =
  | "idle"
  | "confirm"
  | "running"
  | "completed"
  | "cancelled"
  | "error";


const DOWNLOAD_BATCH_SIZE =
  30;


/*
 * =========================================================
 * CLOUDINARY
 * =========================================================
 */


function getThumbnailUrl(
  url: string,
  width = 520
) {

  return url.replace(
    "/upload/",
    `/upload/f_auto,q_auto,c_fill,g_auto,w_${width},h_${width}/`
  );

}


function getViewerUrl(
  url: string
) {

  return url.replace(
    "/upload/",
    "/upload/f_auto,q_auto,c_limit,w_1600/"
  );

}


/*
 * =========================================================
 * NOMBRE DE ARCHIVO
 * =========================================================
 */


function getPhotoFilename(
  photo: Photo
) {

  const shortId =
    photo.id
      .slice(
        0,
        8
      )
      .toUpperCase();


  const extension =
    photo.format ||
    "jpg";


  return (
    `Recuerdo-Fernanda-2026-${shortId}.${extension}`
  );

}


/*
 * =========================================================
 * DESCARGA DIRECTA
 * =========================================================
 */


function downloadBlob(
  blob: Blob,
  filename: string
) {

  const objectUrl =
    URL.createObjectURL(
      blob
    );


  const link =
    document.createElement(
      "a"
    );


  link.href =
    objectUrl;

  link.download =
    filename;

  link.style.display =
    "none";


  document.body.appendChild(
    link
  );


  link.click();

  link.remove();


  window.setTimeout(
    () => {

      URL.revokeObjectURL(
        objectUrl
      );

    },
    2000
  );

}


/*
 * =========================================================
 * DETECTAR MÓVIL
 * =========================================================
 */


function isMobileLikeDevice() {

  if (
    typeof window ===
    "undefined"
  ) {

    return false;

  }


  const coarsePointer =
    window
      .matchMedia(
        "(pointer: coarse)"
      )
      .matches;


  const hasTouch =
    navigator.maxTouchPoints >
    0;


  return (
    coarsePointer &&
    hasTouch
  );

}


/*
 * =========================================================
 * FOTO → FILE
 * =========================================================
 */


async function photoToFile(
  photo: Photo
) {

  const response =
    await fetch(
      photo.secure_url
    );


  if (
    !response.ok
  ) {

    throw new Error(
      "No se pudo descargar una de las fotografías."
    );

  }


  const blob =
    await response.blob();


  return new File(
    [blob],
    getPhotoFilename(
      photo
    ),
    {
      type:
        blob.type ||
        "image/jpeg"
    }
  );

}


/*
 * =========================================================
 * GUARDAR UNA FOTO
 * =========================================================
 */


async function savePhoto(
  photo: Photo
) {

  try {

    const file =
      await photoToFile(
        photo
      );


    /*
     * MÓVIL
     */

    if (
      isMobileLikeDevice() &&
      typeof navigator.share ===
        "function" &&
      typeof navigator.canShare ===
        "function" &&
      navigator.canShare({
        files: [file]
      })
    ) {

      try {

        await navigator.share({
          files: [file],
          title:
            "Recuerdo de los 15 de Fernanda"
        });


        return;

      } catch (
        error
      ) {

        if (
          error instanceof DOMException &&
          error.name ===
            "AbortError"
        ) {

          return;

        }

      }

    }


    /*
     * PC / FALLBACK
     */

    downloadBlob(
      file,
      file.name
    );


  } catch (
    error
  ) {

    console.error(
      "Error guardando fotografía:",
      error
    );


    window.alert(
      "No se pudo guardar la fotografía."
    );

  }

}


/*
 * =========================================================
 * PAUSA ENTRE DESCARGAS
 * =========================================================
 */


function delay(
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


/*
 * =========================================================
 * COMPONENTE
 * =========================================================
 */


export default function Gallery() {

  const supabase =
    useMemo(
      () =>
        getSupabaseBrowser(),
      []
    );


  /*
   * =======================================================
   * GALERÍA
   * =======================================================
   */


  const [
    userId,
    setUserId
  ] =
    useState("");


  const [
    photos,
    setPhotos
  ] =
    useState<Photo[]>(
      []
    );


  const [
    favoriteIds,
    setFavoriteIds
  ] =
    useState<
      Set<string>
    >(
      new Set<string>()
    );


  const [
    tab,
    setTab
  ] =
    useState<GalleryTab>(
      "all"
    );


  const [
    openPhoto,
    setOpenPhoto
  ] =
    useState<Photo | null>(
      null
    );


  const [
    loading,
    setLoading
  ] =
    useState(true);


  const [
    errorMessage,
    setErrorMessage
  ] =
    useState("");


  /*
   * =======================================================
   * ELIMINACIÓN
   * =======================================================
   */


  const [
    deleteCandidate,
    setDeleteCandidate
  ] =
    useState<Photo | null>(
      null
    );


  const [
    deletingPhotoId,
    setDeletingPhotoId
  ] =
    useState<
      string | null
    >(
      null
    );


  /*
   * =======================================================
   * SELECCIÓN
   * =======================================================
   */


  const [
    selectionMode,
    setSelectionMode
  ] =
    useState(false);


  const [
    selectedIds,
    setSelectedIds
  ] =
    useState<
      Set<string>
    >(
      new Set<string>()
    );


  /*
   * =======================================================
   * DESCARGA MASIVA
   * =======================================================
   */


  const [
    downloadStatus,
    setDownloadStatus
  ] =
    useState<DownloadStatus>(
      "idle"
    );


  const [
    pendingDownloadPhotos,
    setPendingDownloadPhotos
  ] =
    useState<Photo[]>(
      []
    );


  const [
    downloadCurrent,
    setDownloadCurrent
  ] =
    useState(0);


  const [
    downloadTotal,
    setDownloadTotal
  ] =
    useState(0);


  const [
    downloadError,
    setDownloadError
  ] =
    useState("");


  const cancelDownloadRef =
    useRef(false);


  /*
   * =======================================================
   * CARGAR GALERÍA
   * =======================================================
   */


  const loadGallery =
    useCallback(

      async () => {

        try {

          const session =
            await ensureAnonymousSession();


          const currentUserId =
            session.user.id;


          setUserId(
            currentUserId
          );


          const {
            data:
              photoRows,

            error:
              photoError
          } =
            await supabase

              .from(
                "photos"
              )

              .select("*")

              .order(
                "created_at",
                {
                  ascending:
                    false
                }
              )

              .limit(
                500
              );


          if (
            photoError
          ) {

            throw photoError;

          }


          const {
            data:
              favoriteRows,

            error:
              favoriteError
          } =
            await supabase

              .from(
                "favorites"
              )

              .select(
                "photo_id"
              );


          if (
            favoriteError
          ) {

            throw favoriteError;

          }


          const loadedPhotos =
            (
              photoRows ??
              []
            ) as Photo[];


          setPhotos(
            loadedPhotos
          );


          /*
           * Foto abierta actualizada.
           */

          setOpenPhoto(
            (
              previous
            ) => {

              if (
                !previous
              ) {

                return null;

              }


              return (
                loadedPhotos.find(
                  (
                    photo
                  ) =>
                    photo.id ===
                    previous.id
                ) ??
                null
              );

            }
          );


          /*
           * Limpiar selección de
           * fotos que ya no existan.
           */

          setSelectedIds(
            (
              previous
            ) => {

              const existingIds =
                new Set<string>(
                  loadedPhotos.map(
                    (
                      photo
                    ) =>
                      photo.id
                  )
                );


              const next =
                new Set<string>();


              previous.forEach(
                (
                  id
                ) => {

                  if (
                    existingIds.has(
                      id
                    )
                  ) {

                    next.add(
                      id
                    );

                  }

                }
              );


              return next;

            }
          );


          const typedFavoriteRows =
            (
              favoriteRows ??
              []
            ) as FavoriteRow[];


          const newFavorites =
            new Set<string>();


          for (
            const row of
            typedFavoriteRows
          ) {

            if (
              typeof row.photo_id ===
              "string"
            ) {

              newFavorites.add(
                row.photo_id
              );

            }

          }


          setFavoriteIds(
            newFavorites
          );


          setErrorMessage(
            ""
          );


        } catch (
          error
        ) {

          console.error(
            "Error cargando galería:",
            error
          );


          setErrorMessage(
            "No pudimos cargar los recuerdos. Revisa tu conexión e inténtalo nuevamente."
          );


        } finally {

          setLoading(
            false
          );

        }

      },

      [
        supabase
      ]

    );


  /*
   * =======================================================
   * ACTUALIZACIÓN AUTOMÁTICA
   * =======================================================
   */


  useEffect(
    () => {

      void loadGallery();


      const interval =
        window.setInterval(

          () => {

            if (
              document.visibilityState ===
                "visible" &&
              navigator.onLine
            ) {

              void loadGallery();

            }

          },

          6000

        );


      const galleryRefreshHandler =
        () => {

          void loadGallery();

        };


      const onlineHandler =
        () => {

          void loadGallery();

        };


      const visibilityHandler =
        () => {

          if (
            document.visibilityState ===
              "visible" &&
            navigator.onLine
          ) {

            void loadGallery();

          }

        };


      window.addEventListener(
        "mis15:gallery-refresh",
        galleryRefreshHandler
      );


      window.addEventListener(
        "online",
        onlineHandler
      );


      document.addEventListener(
        "visibilitychange",
        visibilityHandler
      );


      return () => {

        window.clearInterval(
          interval
        );


        window.removeEventListener(
          "mis15:gallery-refresh",
          galleryRefreshHandler
        );


        window.removeEventListener(
          "online",
          onlineHandler
        );


        document.removeEventListener(
          "visibilitychange",
          visibilityHandler
        );

      };

    },

    [
      loadGallery
    ]

  );


  /*
   * =======================================================
   * FAVORITOS
   * =======================================================
   */


  async function toggleFavorite(
    photo: Photo
  ) {

    if (
      !userId
    ) {

      return;

    }


    const alreadyFavorite =
      favoriteIds.has(
        photo.id
      );


    if (
      alreadyFavorite
    ) {

      const {
        error
      } =
        await supabase

          .from(
            "favorites"
          )

          .delete()

          .eq(
            "photo_id",
            photo.id
          )

          .eq(
            "user_id",
            userId
          );


      if (
        error
      ) {

        console.error(
          error
        );


        window.alert(
          "No se pudo quitar el favorito."
        );


        return;

      }


      setFavoriteIds(
        (
          previous
        ) => {

          const next =
            new Set<string>(
              previous
            );


          next.delete(
            photo.id
          );


          return next;

        }
      );


      setPhotos(
        (
          previous
        ) =>
          previous.map(
            (
              current
            ) =>
              current.id ===
              photo.id

                ? {
                    ...current,

                    favorite_count:
                      Math.max(
                        0,
                        current.favorite_count -
                          1
                      )
                  }

                : current
          )
      );


      setOpenPhoto(
        (
          previous
        ) => {

          if (
            !previous ||
            previous.id !==
              photo.id
          ) {

            return previous;

          }


          return {
            ...previous,

            favorite_count:
              Math.max(
                0,
                previous.favorite_count -
                  1
              )
          };

        }
      );


      return;

    }


    /*
     * AGREGAR FAVORITO
     */


    const favoriteToInsert = {

      photo_id:
        photo.id,

      user_id:
        userId

    };


    const {
      error
    } =
      await supabase

        .from(
          "favorites"
        )

        .insert(
          favoriteToInsert as never
        );


    if (
      error
    ) {

      console.error(
        error
      );


      window.alert(
        "No se pudo marcar como favorito."
      );


      return;

    }


    setFavoriteIds(
      (
        previous
      ) => {

        const next =
          new Set<string>(
            previous
          );


        next.add(
          photo.id
        );


        return next;

      }
    );


    setPhotos(
      (
        previous
      ) =>
        previous.map(
          (
            current
          ) =>
            current.id ===
            photo.id

              ? {
                  ...current,

                  favorite_count:
                    current.favorite_count +
                    1
                }

              : current
        )
    );


    setOpenPhoto(
      (
        previous
      ) => {

        if (
          !previous ||
          previous.id !==
            photo.id
        ) {

          return previous;

        }


        return {
          ...previous,

          favorite_count:
            previous.favorite_count +
            1
        };

      }
    );

  }


  /*
   * =======================================================
   * SOLICITAR ELIMINACIÓN
   * =======================================================
   *
   * Ya NO usamos window.confirm().
   */


  function requestDeletePhoto(
    photo: Photo
  ) {

    if (
      photo.owner_id !==
      userId
    ) {

      return;

    }


    setDeleteCandidate(
      photo
    );

  }


  /*
   * =======================================================
   * CONFIRMAR ELIMINACIÓN
   * =======================================================
   */


  async function confirmDeletePhoto() {

    const photo =
      deleteCandidate;


    if (
      !photo
    ) {

      return;

    }


    if (
      photo.owner_id !==
      userId
    ) {

      setDeleteCandidate(
        null
      );


      return;

    }


    setDeletingPhotoId(
      photo.id
    );


    try {

      const token =
        await getAccessToken();


      if (
        !token
      ) {

        throw new Error(
          "No se pudo validar tu sesión."
        );

      }


      const response =
        await fetch(
          "/api/photos/delete",
          {
            method:
              "POST",

            headers: {

              Authorization:
                `Bearer ${token}`,

              "Content-Type":
                "application/json"

            },

            body:
              JSON.stringify({
                id:
                  photo.id
              })
          }
        );


      const body =
        await response
          .json()
          .catch(
            () => null
          );


      if (
        !response.ok
      ) {

        throw new Error(
          body?.error ??
          "No se pudo eliminar."
        );

      }


      setDeleteCandidate(
        null
      );


      setOpenPhoto(
        null
      );


      setPhotos(
        (
          previous
        ) =>
          previous.filter(
            (
              current
            ) =>
              current.id !==
              photo.id
          )
      );


      setFavoriteIds(
        (
          previous
        ) => {

          const next =
            new Set<string>(
              previous
            );


          next.delete(
            photo.id
          );


          return next;

        }
      );


      setSelectedIds(
        (
          previous
        ) => {

          const next =
            new Set<string>(
              previous
            );


          next.delete(
            photo.id
          );


          return next;

        }
      );


      window.dispatchEvent(
        new Event(
          "mis15:gallery-refresh"
        )
      );


    } catch (
      error
    ) {

      console.error(
        "Error eliminando fotografía:",
        error
      );


      window.alert(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la fotografía."
      );


    } finally {

      setDeletingPhotoId(
        null
      );

    }

  }


  /*
   * =======================================================
   * FILTRAR FOTOS
   * =======================================================
   */


  const visiblePhotos =
    useMemo(

      () => {

        const filtered =
          photos.filter(
            (
              photo
            ) => {

              if (
                tab ===
                "mine"
              ) {

                return (
                  photo.owner_id ===
                  userId
                );

              }


              if (
                tab ===
                "favorites"
              ) {

                return (
                  photo.favorite_count >
                  0
                );

              }


              return true;

            }
          );


        if (
          tab ===
          "favorites"
        ) {

          return filtered.sort(
            (
              a,
              b
            ) => {

              if (
                b.favorite_count !==
                a.favorite_count
              ) {

                return (
                  b.favorite_count -
                  a.favorite_count
                );

              }


              return (
                new Date(
                  b.created_at
                ).getTime() -

                new Date(
                  a.created_at
                ).getTime()
              );

            }
          );

        }


        return filtered.sort(
          (
            a,
            b
          ) => {

            if (
              a.is_featured !==
              b.is_featured
            ) {

              return (
                Number(
                  b.is_featured
                ) -

                Number(
                  a.is_featured
                )
              );

            }


            return (
              new Date(
                b.created_at
              ).getTime() -

              new Date(
                a.created_at
              ).getTime()
            );

          }
        );

      },

      [
        photos,
        tab,
        userId
      ]

    );


  /*
   * =======================================================
   * SELECCIÓN
   * =======================================================
   */


  function startSelectionMode() {

    setSelectionMode(
      true
    );


    setOpenPhoto(
      null
    );

  }


  function cancelSelectionMode() {

    setSelectionMode(
      false
    );


    setSelectedIds(
      new Set<string>()
    );

  }


  function togglePhotoSelection(
    photo: Photo
  ) {

    setSelectedIds(
      (
        previous
      ) => {

        const next =
          new Set<string>(
            previous
          );


        if (
          next.has(
            photo.id
          )
        ) {

          next.delete(
            photo.id
          );

        } else {

          /*
           * SIN LÍMITE DE SELECCIÓN.
           */

          next.add(
            photo.id
          );

        }


        return next;

      }
    );

  }


  function selectAllVisible() {

    setSelectedIds(
      new Set<string>(
        visiblePhotos.map(
          (
            photo
          ) =>
            photo.id
        )
      )
    );

  }


  function clearSelection() {

    setSelectedIds(
      new Set<string>()
    );

  }


  const selectedPhotos =
    useMemo(

      () =>
        visiblePhotos.filter(
          (
            photo
          ) =>
            selectedIds.has(
              photo.id
            )
        ),

      [
        visiblePhotos,
        selectedIds
      ]

    );


  /*
   * =======================================================
   * SOLICITAR DESCARGA
   * =======================================================
   *
   * Tanto Guardar seleccionadas como
   * Guardar todas pasan primero por aquí.
   */


  function requestBulkDownload(
    targetPhotos: Photo[]
  ) {

    if (
      targetPhotos.length ===
      0
    ) {

      return;

    }


    setPendingDownloadPhotos(
      [...targetPhotos]
    );


    setDownloadTotal(
      targetPhotos.length
    );


    setDownloadCurrent(
      0
    );


    setDownloadError(
      ""
    );


    setDownloadStatus(
      "confirm"
    );

  }


  /*
   * =======================================================
   * CANCELAR CONFIRMACIÓN
   * =======================================================
   */


  function cancelDownloadConfirmation() {

    setPendingDownloadPhotos(
      []
    );


    setDownloadTotal(
      0
    );


    setDownloadCurrent(
      0
    );


    setDownloadStatus(
      "idle"
    );

  }


  /*
   * =======================================================
   * EJECUTAR DESCARGA
   * =======================================================
   */


  async function confirmBulkDownload() {

    const targetPhotos =
      [...pendingDownloadPhotos];


    if (
      targetPhotos.length ===
      0
    ) {

      setDownloadStatus(
        "idle"
      );


      return;

    }


    cancelDownloadRef.current =
      false;


    setDownloadCurrent(
      0
    );


    setDownloadTotal(
      targetPhotos.length
    );


    setDownloadError(
      ""
    );


    setDownloadStatus(
      "running"
    );


    let downloaded =
      0;


    try {

      /*
       * Se procesa internamente
       * en grupos de 30.
       *
       * El usuario no necesita
       * conocer este detalle.
       */


      for (
        let batchStart = 0;

        batchStart <
        targetPhotos.length;

        batchStart +=
          DOWNLOAD_BATCH_SIZE
      ) {

        if (
          cancelDownloadRef.current
        ) {

          break;

        }


        const batch =
          targetPhotos.slice(
            batchStart,
            batchStart +
              DOWNLOAD_BATCH_SIZE
          );


        for (
          const photo of
          batch
        ) {

          if (
            cancelDownloadRef.current
          ) {

            break;

          }


          const file =
            await photoToFile(
              photo
            );


          downloadBlob(
            file,
            file.name
          );


          downloaded +=
            1;


          setDownloadCurrent(
            downloaded
          );


          await delay(
            300
          );

        }

      }


      if (
        cancelDownloadRef.current
      ) {

        setDownloadStatus(
          "cancelled"
        );


        return;

      }


      setDownloadStatus(
        "completed"
      );


    } catch (
      error
    ) {

      console.error(
        "Error descargando fotografías:",
        error
      );


      setDownloadError(
        error instanceof Error
          ? error.message
          : "No se pudieron descargar todas las fotografías."
      );


      setDownloadStatus(
        "error"
      );

    }

  }


  /*
   * =======================================================
   * CANCELAR DESCARGA EN CURSO
   * =======================================================
   */


  function cancelBulkDownload() {

    cancelDownloadRef.current =
      true;

  }


  /*
   * =======================================================
   * CERRAR RESULTADO DE DESCARGA
   * =======================================================
   */


  function closeDownloadModal() {

    if (
      downloadStatus ===
      "running"
    ) {

      return;

    }


    setPendingDownloadPhotos(
      []
    );


    setDownloadStatus(
      "idle"
    );


    setDownloadCurrent(
      0
    );


    setDownloadTotal(
      0
    );


    setDownloadError(
      ""
    );

  }


  const downloadPercentage =
    downloadTotal >
    0

      ? Math.round(
          (
            downloadCurrent /
            downloadTotal
          ) *
            100
        )

      : 0;


  /*
   * =======================================================
   * NAVEGACIÓN ENTRE FOTOS
   * =======================================================
   */


  const currentPhotoIndex =
    openPhoto

      ? visiblePhotos.findIndex(
          (
            photo
          ) =>
            photo.id ===
            openPhoto.id
        )

      : -1;


  function openPreviousPhoto() {

    if (
      visiblePhotos.length <=
      1
    ) {

      return;

    }


    const previousIndex =
      currentPhotoIndex <=
      0

        ? visiblePhotos.length -
          1

        : currentPhotoIndex -
          1;


    setOpenPhoto(
      visiblePhotos[
        previousIndex
      ]
    );

  }


  function openNextPhoto() {

    if (
      visiblePhotos.length <=
      1
    ) {

      return;

    }


    const nextIndex =
      currentPhotoIndex >=
      visiblePhotos.length -
        1

        ? 0

        : currentPhotoIndex +
          1;


    setOpenPhoto(
      visiblePhotos[
        nextIndex
      ]
    );

  }


  /*
   * =======================================================
   * TECLADO
   * =======================================================
   */


  useEffect(
    () => {

      if (
        !openPhoto
      ) {

        return;

      }


      function handleKeyboard(
        event: KeyboardEvent
      ) {

        if (
          event.key ===
          "ArrowLeft"
        ) {

          const previousIndex =
            currentPhotoIndex <=
            0

              ? visiblePhotos.length -
                1

              : currentPhotoIndex -
                1;


          if (
            visiblePhotos[
              previousIndex
            ]
          ) {

            setOpenPhoto(
              visiblePhotos[
                previousIndex
              ]
            );

          }

        }


        if (
          event.key ===
          "ArrowRight"
        ) {

          const nextIndex =
            currentPhotoIndex >=
            visiblePhotos.length -
              1

              ? 0

              : currentPhotoIndex +
                1;


          if (
            visiblePhotos[
              nextIndex
            ]
          ) {

            setOpenPhoto(
              visiblePhotos[
                nextIndex
              ]
            );

          }

        }


        if (
          event.key ===
          "Escape"
        ) {

          setOpenPhoto(
            null
          );

        }

      }


      window.addEventListener(
        "keydown",
        handleKeyboard
      );


      return () => {

        window.removeEventListener(
          "keydown",
          handleKeyboard
        );

      };

    },

    [
      openPhoto,
      currentPhotoIndex,
      visiblePhotos
    ]

  );


  /*
   * =======================================================
   * LOADING
   * =======================================================
   */


  if (
    loading
  ) {

    return (

      <section
        className="
          mt-10
          flex
          min-h-40
          items-center
          justify-center
        "
      >

        <div
          className="
            flex
            flex-col
            items-center
            gap-3
            text-center
          "
        >

          <div
            className="
              h-8
              w-8
              animate-spin
              rounded-full
              border-2
              border-[#d8c2d5]
              border-t-[#765071]
            "
          />


          <p
            className="
              text-sm
              text-[#82697d]
            "
          >
            Cargando recuerdos...
          </p>

        </div>

      </section>

    );

  }


  /*
   * =======================================================
   * UI
   * =======================================================
   */


  return (

    <section
      className="mt-8"
    >

      {/* ===================================================
          ENCABEZADO
      ==================================================== */}


      <div
        className="
          mb-4
          flex
          flex-wrap
          items-end
          justify-between
          gap-3
        "
      >

        <div>

          <h2
            className="
              text-2xl
              font-semibold
              text-[#543550]
            "
          >
            Recuerdos de esta noche
          </h2>


          <p
            className="
              mt-1
              text-sm
              text-[#82697d]
            "
          >

            {photos.length}
            {" "}

            {
              photos.length ===
              1

                ? "foto compartida"

                : "fotos compartidas"
            }

          </p>

        </div>


        {
          visiblePhotos.length >
            0 &&
          !selectionMode && (

            <div
              className="
                flex
                flex-wrap
                gap-2
              "
            >

              {/* SELECCIONAR */}

              <button
                type="button"
                onClick={
                  startSelectionMode
                }
                className="
                  flex
                  min-h-11
                  items-center
                  gap-2
                  rounded-full
                  bg-white
                  px-4
                  text-sm
                  font-semibold
                  text-[#765071]
                  shadow
                  transition-all
                  duration-200
                  hover:scale-105
                  hover:bg-[#eee4f2]
                "
              >

                <Images
                  size={18}
                />

                Seleccionar

              </button>


              {/* GUARDAR TODAS */}

              <button
                type="button"
                onClick={
                  () =>
                    requestBulkDownload(
                      visiblePhotos
                    )
                }
                className="
                  flex
                  min-h-11
                  items-center
                  gap-2
                  rounded-full
                  bg-[#765071]
                  px-4
                  text-sm
                  font-semibold
                  text-white
                  shadow
                  transition-all
                  duration-200
                  hover:scale-105
                  hover:bg-[#5f3e5b]
                "
              >

                <Download
                  size={18}
                />

                Guardar todas

              </button>

            </div>

          )
        }

      </div>


      {/* ===================================================
          ERROR GENERAL
      ==================================================== */}


      {
        errorMessage && (

          <div
            className="
              mb-4
              rounded-2xl
              bg-red-50
              p-4
              text-sm
              text-red-700
            "
          >

            <p>
              {errorMessage}
            </p>


            <button
              type="button"
              onClick={
                () =>
                  void loadGallery()
              }
              className="
                mt-3
                font-semibold
                underline
              "
            >
              Intentar nuevamente
            </button>

          </div>

        )
      }


      {/* ===================================================
          PESTAÑAS
      ==================================================== */}


      <div
        className="
          sticky
          top-2
          z-20
          mb-5
          grid
          grid-cols-3
          rounded-2xl
          border
          border-white/80
          bg-white/90
          p-1
          shadow-lg
          backdrop-blur
        "
      >

        <button
          type="button"
          onClick={
            () => {

              setTab(
                "all"
              );

              cancelSelectionMode();

            }
          }
          className={`
            min-h-12
            rounded-xl
            px-2
            text-xs
            font-semibold
            transition-all
            duration-200
            hover:scale-[1.02]
            sm:text-sm

            ${
              tab === "all"
                ? "bg-[#765071] text-white shadow"
                : "text-[#745c70] hover:bg-[#eee4f2]"
            }
          `}
        >
          ✨ Todos
        </button>


        <button
          type="button"
          onClick={
            () => {

              setTab(
                "favorites"
              );

              cancelSelectionMode();

            }
          }
          className={`
            min-h-12
            rounded-xl
            px-2
            text-xs
            font-semibold
            transition-all
            duration-200
            hover:scale-[1.02]
            sm:text-sm

            ${
              tab === "favorites"
                ? "bg-[#765071] text-white shadow"
                : "text-[#745c70] hover:bg-[#f6e3eb]"
            }
          `}
        >
          ❤️ Favoritos
        </button>


        <button
          type="button"
          onClick={
            () => {

              setTab(
                "mine"
              );

              cancelSelectionMode();

            }
          }
          className={`
            min-h-12
            rounded-xl
            px-2
            text-xs
            font-semibold
            transition-all
            duration-200
            hover:scale-[1.02]
            sm:text-sm

            ${
              tab === "mine"
                ? "bg-[#765071] text-white shadow"
                : "text-[#745c70] hover:bg-[#eee4f2]"
            }
          `}
        >
          👤 Mis fotos
        </button>

      </div>


      {/* ===================================================
          BARRA DE SELECCIÓN
      ==================================================== */}


      {
        selectionMode && (

          <div
            className="
              sticky
              top-[68px]
              z-20
              mb-5
              rounded-2xl
              border
              border-[#dfcfe0]
              bg-white/95
              p-3
              shadow-xl
              backdrop-blur
            "
          >

            <div
              className="
                flex
                flex-wrap
                items-center
                justify-between
                gap-3
              "
            >

              <div>

                <p
                  className="
                    font-semibold
                    text-[#543550]
                  "
                >

                  {selectedIds.size}
                  {" "}

                  {
                    selectedIds.size ===
                    1

                      ? "foto seleccionada"

                      : "fotos seleccionadas"
                  }

                </p>


                <p
                  className="
                    text-xs
                    text-[#8b7284]
                  "
                >
                  Puedes seleccionar todas las que quieras.
                </p>

              </div>


              <div
                className="
                  flex
                  flex-wrap
                  gap-2
                "
              >

                <button
                  type="button"
                  onClick={
                    selectAllVisible
                  }
                  className="
                    min-h-10
                    rounded-full
                    border
                    border-[#d7c4d5]
                    bg-white
                    px-4
                    text-sm
                    font-semibold
                    text-[#765071]
                    transition-all
                    hover:scale-105
                    hover:bg-[#eee4f2]
                  "
                >
                  Seleccionar todas
                </button>


                {
                  selectedIds.size >
                    0 && (

                    <button
                      type="button"
                      onClick={
                        clearSelection
                      }
                      className="
                        min-h-10
                        rounded-full
                        border
                        border-[#d7c4d5]
                        bg-white
                        px-4
                        text-sm
                        font-semibold
                        text-[#765071]
                        transition-all
                        hover:scale-105
                        hover:bg-[#eee4f2]
                      "
                    >
                      Quitar selección
                    </button>

                  )
                }


                {/* GUARDAR SELECCIONADAS */}

                <button
                  type="button"
                  disabled={
                    selectedPhotos.length ===
                    0
                  }
                  onClick={
                    () =>
                      requestBulkDownload(
                        selectedPhotos
                      )
                  }
                  className="
                    flex
                    min-h-10
                    items-center
                    gap-2
                    rounded-full
                    bg-[#765071]
                    px-4
                    text-sm
                    font-semibold
                    text-white
                    shadow
                    transition-all
                    hover:scale-105
                    hover:bg-[#5f3e5b]
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                    disabled:hover:scale-100
                  "
                >

                  <Download
                    size={17}
                  />

                  Guardar seleccionadas

                </button>


                <button
                  type="button"
                  onClick={
                    cancelSelectionMode
                  }
                  className="
                    min-h-10
                    rounded-full
                    bg-[#f7e4e8]
                    px-4
                    text-sm
                    font-semibold
                    text-[#a4405c]
                    transition-all
                    hover:scale-105
                    hover:bg-[#efcbd4]
                  "
                >
                  Cancelar
                </button>

              </div>

            </div>

          </div>

        )
      }


      {/* ===================================================
          INFORMACIÓN
      ==================================================== */}


      {
        tab ===
        "mine" &&
        !selectionMode && (

          <div
            className="
              mb-4
              rounded-2xl
              bg-white/65
              px-4
              py-3
              text-sm
              text-[#745c70]
            "
          >

            Has compartido{" "}

            <strong>
              {visiblePhotos.length}
            </strong>

            {" "}

            {
              visiblePhotos.length ===
              1
                ? "recuerdo"
                : "recuerdos"
            }.

          </div>

        )
      }


      {
        tab ===
        "favorites" &&
        !selectionMode && (

          <div
            className="
              mb-4
              rounded-2xl
              bg-white/65
              px-4
              py-3
              text-sm
              text-[#745c70]
            "
          >

            Los recuerdos que más han gustado
            a los invitados aparecen primero.

          </div>

        )
      }


      {/* ===================================================
          GALERÍA VACÍA
      ==================================================== */}


      {
        visiblePhotos.length ===
        0

          ? (

            <div
              className="
                rounded-3xl
                border
                border-white/80
                bg-white/70
                px-5
                py-14
                text-center
                shadow
              "
            >

              <div
                className="text-4xl"
              >

                {
                  tab === "favorites"
                    ? "❤️"
                    : tab === "mine"
                      ? "📷"
                      : "✨"
                }

              </div>


              <p
                className="
                  mt-4
                  font-semibold
                  text-[#674e62]
                "
              >

                {
                  tab === "favorites"
                    ? "Todavía no hay favoritos."
                    : tab === "mine"
                      ? "Todavía no has compartido fotografías."
                      : "Todavía no hay recuerdos compartidos."
                }

              </p>

            </div>

          )

          : (

            <div
              className="
                grid
                grid-cols-2
                gap-2
                sm:grid-cols-3
                sm:gap-3
                lg:grid-cols-4
                xl:grid-cols-5
              "
            >

              {
                visiblePhotos.map(
                  (
                    photo
                  ) => {

                    const isFavorite =
                      favoriteIds.has(
                        photo.id
                      );


                    const isOwner =
                      photo.owner_id ===
                      userId;


                    const isSelected =
                      selectedIds.has(
                        photo.id
                      );


                    return (

                      <article
                        key={
                          photo.id
                        }
                        className={`
                          group
                          relative
                          overflow-hidden
                          rounded-2xl
                          bg-white
                          shadow-md
                          transition-all
                          duration-300
                          hover:-translate-y-1
                          hover:shadow-xl

                          ${
                            isSelected
                              ? "ring-4 ring-[#765071] ring-offset-2"
                              : ""
                          }
                        `}
                      >

                        {/* FOTO */}

                        <button
                          type="button"
                          onClick={
                            () => {

                              if (
                                selectionMode
                              ) {

                                togglePhotoSelection(
                                  photo
                                );


                                return;

                              }


                              setOpenPhoto(
                                photo
                              );

                            }
                          }
                          className="
                            block
                            w-full
                            overflow-hidden
                          "
                        >

                          <img
                            src={
                              getThumbnailUrl(
                                photo.secure_url,
                                520
                              )
                            }
                            alt="Recuerdo de los 15 años de Fernanda"
                            loading="lazy"
                            className="
                              aspect-square
                              w-full
                              object-cover
                              transition-transform
                              duration-300
                              group-hover:scale-[1.04]
                            "
                          />


                          {
                            selectionMode && (

                              <span
                                className={`
                                  absolute
                                  inset-0
                                  transition

                                  ${
                                    isSelected
                                      ? "bg-[#765071]/25"
                                      : "bg-black/5 group-hover:bg-black/10"
                                  }
                                `}
                              />

                            )
                          }

                        </button>


                        {/* CHECK */}

                        {
                          selectionMode && (

                            <button
                              type="button"
                              onClick={
                                () =>
                                  togglePhotoSelection(
                                    photo
                                  )
                              }
                              aria-label={
                                isSelected
                                  ? "Quitar de la selección"
                                  : "Seleccionar fotografía"
                              }
                              className={`
                                absolute
                                right-2
                                top-2
                                z-10
                                flex
                                h-10
                                w-10
                                items-center
                                justify-center
                                rounded-full
                                shadow-lg
                                transition-all
                                duration-200
                                hover:scale-110

                                ${
                                  isSelected
                                    ? "bg-[#765071] text-white"
                                    : "bg-white/95 text-[#765071]"
                                }
                              `}
                            >

                              {
                                isSelected

                                  ? (
                                    <Check
                                      size={22}
                                      strokeWidth={3}
                                    />
                                  )

                                  : (
                                    <CheckCircle2
                                      size={22}
                                    />
                                  )
                              }

                            </button>

                          )
                        }


                        {/* DESTACADA */}

                        {
                          !selectionMode &&
                          photo.is_featured && (

                            <span
                              className="
                                absolute
                                left-2
                                top-2
                                flex
                                items-center
                                gap-1
                                rounded-full
                                bg-white/95
                                px-2
                                py-1
                                text-[11px]
                                font-semibold
                                text-[#956b2e]
                                shadow
                              "
                            >

                              <Star
                                size={13}
                                fill="#d7a956"
                              />

                              Destacada

                            </span>

                          )
                        }


                        {/* TU FOTO */}

                        {
                          !selectionMode &&
                          isOwner && (

                            <span
                              className="
                                absolute
                                bottom-2
                                left-2
                                rounded-full
                                bg-black/55
                                px-2
                                py-1
                                text-[10px]
                                font-medium
                                text-white
                              "
                            >
                              Tu foto
                            </span>

                          )
                        }


                        {/* FAVORITO */}

                        {
                          !selectionMode && (

                            <button
                              type="button"
                              onClick={
                                () =>
                                  void toggleFavorite(
                                    photo
                                  )
                              }
                              aria-label={
                                isFavorite
                                  ? "Quitar favorito"
                                  : "Agregar favorito"
                              }
                              className="
                                absolute
                                bottom-2
                                right-2
                                flex
                                min-h-10
                                min-w-10
                                items-center
                                justify-center
                                gap-1
                                rounded-full
                                bg-white/95
                                px-3
                                text-sm
                                font-semibold
                                text-[#8e4966]
                                shadow
                                transition-all
                                duration-200
                                hover:scale-110
                                hover:bg-[#f7dfe9]
                                hover:text-[#a64069]
                              "
                            >

                              <Heart
                                size={17}
                                color="#b85f80"
                                fill={
                                  isFavorite
                                    ? "#b85f80"
                                    : "none"
                                }
                              />

                              {
                                photo.favorite_count
                              }

                            </button>

                          )
                        }

                      </article>

                    );

                  }
                )
              }

            </div>

          )
      }


      {/* ===================================================
          VISOR FULLSCREEN
      ==================================================== */}


      {
        openPhoto &&
        !selectionMode && (

          <div
            className="
              fixed
              inset-0
              z-50
              flex
              items-center
              justify-center
              bg-black/90
              p-3
              sm:p-6
            "
            role="dialog"
            aria-modal="true"
          >

            {/* X */}

            <button
              type="button"
              onClick={
                () =>
                  setOpenPhoto(
                    null
                  )
              }
              className="
                absolute
                right-4
                top-4
                z-30
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-full
                bg-white
                text-[#543550]
                shadow-xl
                transition-all
                duration-200
                hover:scale-110
                hover:bg-red-600
                hover:text-white
              "
            >

              <X
                size={24}
              />

            </button>


            {/* IZQUIERDA */}

            {
              visiblePhotos.length >
              1 && (

                <button
                  type="button"
                  onClick={
                    openPreviousPhoto
                  }
                  className="
                    absolute
                    left-2
                    top-1/2
                    z-30
                    flex
                    h-12
                    w-12
                    -translate-y-1/2
                    items-center
                    justify-center
                    rounded-full
                    bg-white/95
                    text-[#765071]
                    shadow-xl
                    transition-all
                    duration-200
                    hover:scale-110
                    hover:bg-[#765071]
                    hover:text-white
                    sm:left-5
                    sm:h-14
                    sm:w-14
                  "
                >

                  <ChevronLeft
                    size={30}
                  />

                </button>

              )
            }


            {/* DERECHA */}

            {
              visiblePhotos.length >
              1 && (

                <button
                  type="button"
                  onClick={
                    openNextPhoto
                  }
                  className="
                    absolute
                    right-2
                    top-1/2
                    z-30
                    flex
                    h-12
                    w-12
                    -translate-y-1/2
                    items-center
                    justify-center
                    rounded-full
                    bg-white/95
                    text-[#765071]
                    shadow-xl
                    transition-all
                    duration-200
                    hover:scale-110
                    hover:bg-[#765071]
                    hover:text-white
                    sm:right-5
                    sm:h-14
                    sm:w-14
                  "
                >

                  <ChevronRight
                    size={30}
                  />

                </button>

              )
            }


            <div
              className="
                w-full
                max-w-5xl
                px-12
                sm:px-16
              "
            >

              <img
                src={
                  getViewerUrl(
                    openPhoto.secure_url
                  )
                }
                alt="Recuerdo ampliado"
                className="
                  mx-auto
                  max-h-[75vh]
                  max-w-full
                  rounded-2xl
                  object-contain
                  shadow-2xl
                "
              />


              <div
                className="
                  mt-4
                  flex
                  flex-wrap
                  justify-center
                  gap-2
                "
              >

                {/* FAVORITO */}

                <button
                  type="button"
                  onClick={
                    () =>
                      void toggleFavorite(
                        openPhoto
                      )
                  }
                  className="
                    flex
                    min-h-12
                    items-center
                    gap-2
                    rounded-full
                    bg-white
                    px-5
                    font-semibold
                    text-[#684e62]
                    shadow
                    transition-all
                    duration-200
                    hover:scale-105
                    hover:bg-[#f7dfe9]
                  "
                >

                  <Heart
                    size={19}
                    color="#b85f80"
                    fill={
                      favoriteIds.has(
                        openPhoto.id
                      )
                        ? "#b85f80"
                        : "none"
                    }
                  />

                  {
                    openPhoto.favorite_count
                  }

                </button>


                {/* GUARDAR UNA */}

                <button
                  type="button"
                  onClick={
                    () =>
                      void savePhoto(
                        openPhoto
                      )
                  }
                  className="
                    flex
                    min-h-12
                    items-center
                    gap-2
                    rounded-full
                    bg-white
                    px-5
                    font-semibold
                    text-[#684e62]
                    shadow
                    transition-all
                    duration-200
                    hover:scale-105
                    hover:bg-[#765071]
                    hover:text-white
                  "
                >

                  <Download
                    size={19}
                  />

                  Guardar

                </button>


                {/* ELIMINAR */}

                {
                  openPhoto.owner_id ===
                  userId && (

                    <button
                      type="button"
                      onClick={
                        () =>
                          requestDeletePhoto(
                            openPhoto
                          )
                      }
                      className="
                        flex
                        min-h-12
                        items-center
                        gap-2
                        rounded-full
                        bg-red-600
                        px-5
                        font-semibold
                        text-white
                        shadow
                        transition-all
                        duration-200
                        hover:scale-105
                        hover:bg-red-700
                      "
                    >

                      <Trash2
                        size={19}
                      />

                      Eliminar

                    </button>

                  )
                }

              </div>

            </div>

          </div>

        )
      }


      {/* ===================================================
          MODAL PERSONALIZADO — ELIMINAR
      ==================================================== */}


      {
        deleteCandidate && (

          <div
            className="
              fixed
              inset-0
              z-[80]
              flex
              items-center
              justify-center
              bg-black/65
              p-4
              backdrop-blur-sm
            "
            role="dialog"
            aria-modal="true"
          >

            <div
              className="
                w-full
                max-w-sm
                rounded-3xl
                bg-[#fffaf4]
                p-6
                shadow-2xl
              "
            >

              <div
                className="
                  mx-auto
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-full
                  bg-red-100
                  text-red-600
                "
              >

                <Trash2
                  size={28}
                />

              </div>


              <h3
                className="
                  mt-5
                  text-center
                  text-xl
                  font-semibold
                  text-[#543550]
                "
              >
                Eliminar recuerdo
              </h3>


              <p
                className="
                  mt-3
                  text-center
                  text-sm
                  leading-6
                  text-[#82697d]
                "
              >
                ¿Seguro que deseas eliminar esta fotografía?
              </p>


              <p
                className="
                  mt-1
                  text-center
                  text-xs
                  font-medium
                  text-red-500
                "
              >
                Esta acción no se puede deshacer.
              </p>


              <div
                className="
                  mt-6
                  grid
                  grid-cols-2
                  gap-3
                "
              >

                <button
                  type="button"
                  disabled={
                    deletingPhotoId !==
                    null
                  }
                  onClick={
                    () =>
                      setDeleteCandidate(
                        null
                      )
                  }
                  className="
                    min-h-12
                    rounded-full
                    bg-[#eee4f2]
                    px-4
                    font-semibold
                    text-[#765071]
                    transition-all
                    duration-200
                    hover:scale-[1.03]
                    hover:bg-[#e1d2e4]
                    disabled:opacity-50
                  "
                >
                  Cancelar
                </button>


                <button
                  type="button"
                  disabled={
                    deletingPhotoId !==
                    null
                  }
                  onClick={
                    () =>
                      void confirmDeletePhoto()
                  }
                  className="
                    flex
                    min-h-12
                    items-center
                    justify-center
                    gap-2
                    rounded-full
                    bg-red-600
                    px-4
                    font-semibold
                    text-white
                    shadow
                    transition-all
                    duration-200
                    hover:scale-[1.03]
                    hover:bg-red-700
                    disabled:opacity-60
                  "
                >

                  {
                    deletingPhotoId

                      ? "Eliminando..."

                      : (
                        <>
                          <Trash2
                            size={18}
                          />

                          Eliminar
                        </>
                      )
                  }

                </button>

              </div>

            </div>

          </div>

        )
      }


      {/* ===================================================
          MODAL DESCARGA
      ==================================================== */}


      {
        downloadStatus !==
        "idle" && (

          <div
            className="
              fixed
              inset-0
              z-[90]
              flex
              items-center
              justify-center
              bg-black/65
              p-4
              backdrop-blur-sm
            "
            role="dialog"
            aria-modal="true"
          >

            <div
              className="
                w-full
                max-w-md
                rounded-3xl
                bg-[#fffaf4]
                p-6
                shadow-2xl
              "
            >

              {/* =========================================
                  CONFIRMACIÓN
              ========================================== */}

              {
                downloadStatus ===
                "confirm" && (

                  <>

                    <div
                      className="
                        mx-auto
                        flex
                        h-16
                        w-16
                        items-center
                        justify-center
                        rounded-full
                        bg-[#eee4f2]
                        text-[#765071]
                      "
                    >

                      <Download
                        size={28}
                      />

                    </div>


                    <h3
                      className="
                        mt-5
                        text-center
                        text-xl
                        font-semibold
                        text-[#543550]
                      "
                    >
                      Guardar recuerdos
                    </h3>


                    <p
                      className="
                        mt-3
                        text-center
                        text-sm
                        leading-6
                        text-[#82697d]
                      "
                    >

                      Vas a descargar
                      {" "}

                      <strong
                        className="
                          text-[#543550]
                        "
                      >
                        {pendingDownloadPhotos.length}
                      </strong>

                      {" "}

                      {
                        pendingDownloadPhotos.length ===
                        1

                          ? "fotografía"

                          : "fotografías"
                      }.

                    </p>


                    <div
                      className="
                        mt-4
                        flex
                        gap-3
                        rounded-2xl
                        bg-[#f8f1e9]
                        p-4
                        text-sm
                        leading-6
                        text-[#765f72]
                      "
                    >

                      <AlertTriangle
                        className="
                          mt-0.5
                          shrink-0
                          text-[#ad7c3d]
                        "
                        size={20}
                      />


                      <p>
                        Si son muchas fotografías,
                        la descarga puede tardar algunos
                        minutos.
                      </p>

                    </div>


                    <div
                      className="
                        mt-6
                        grid
                        grid-cols-2
                        gap-3
                      "
                    >

                      <button
                        type="button"
                        onClick={
                          cancelDownloadConfirmation
                        }
                        className="
                          min-h-12
                          rounded-full
                          bg-[#eee4f2]
                          px-4
                          font-semibold
                          text-[#765071]
                          transition-all
                          duration-200
                          hover:scale-[1.03]
                          hover:bg-[#e1d2e4]
                        "
                      >
                        Cancelar
                      </button>


                      <button
                        type="button"
                        onClick={
                          () =>
                            void confirmBulkDownload()
                        }
                        className="
                          flex
                          min-h-12
                          items-center
                          justify-center
                          gap-2
                          rounded-full
                          bg-[#765071]
                          px-4
                          font-semibold
                          text-white
                          shadow
                          transition-all
                          duration-200
                          hover:scale-[1.03]
                          hover:bg-[#5f3e5b]
                        "
                      >

                        <Download
                          size={18}
                        />

                        Continuar

                      </button>

                    </div>

                  </>

                )
              }


              {/* =========================================
                  EN PROGRESO
              ========================================== */}

              {
                downloadStatus ===
                "running" && (

                  <>

                    <div
                      className="
                        mx-auto
                        flex
                        h-14
                        w-14
                        items-center
                        justify-center
                        rounded-full
                        bg-[#eee4f2]
                        text-[#765071]
                      "
                    >

                      <Download
                        size={26}
                      />

                    </div>


                    <h3
                      className="
                        mt-4
                        text-center
                        text-xl
                        font-semibold
                        text-[#543550]
                      "
                    >
                      Descargando recuerdos...
                    </h3>


                    <p
                      className="
                        mt-2
                        text-center
                        text-sm
                        text-[#82697d]
                      "
                    >

                      {downloadCurrent}
                      {" "}
                      de
                      {" "}
                      {downloadTotal}
                      {" "}
                      fotografías

                    </p>


                    <div
                      className="
                        mt-5
                        h-3
                        overflow-hidden
                        rounded-full
                        bg-[#eadfea]
                      "
                    >

                      <div
                        className="
                          h-full
                          rounded-full
                          bg-[#765071]
                          transition-all
                          duration-300
                        "
                        style={{
                          width:
                            `${downloadPercentage}%`
                        }}
                      />

                    </div>


                    <p
                      className="
                        mt-2
                        text-center
                        text-sm
                        font-semibold
                        text-[#765071]
                      "
                    >
                      {downloadPercentage}%
                    </p>


                    <button
                      type="button"
                      onClick={
                        cancelBulkDownload
                      }
                      className="
                        mt-5
                        min-h-12
                        w-full
                        rounded-full
                        bg-[#f7e4e8]
                        px-5
                        font-semibold
                        text-[#a4405c]
                        transition-all
                        duration-200
                        hover:scale-[1.02]
                        hover:bg-[#efcbd4]
                      "
                    >
                      Cancelar descarga
                    </button>

                  </>

                )
              }


              {/* =========================================
                  COMPLETADA
              ========================================== */}

              {
                downloadStatus ===
                "completed" && (

                  <>

                    <div
                      className="
                        mx-auto
                        flex
                        h-14
                        w-14
                        items-center
                        justify-center
                        rounded-full
                        bg-[#e8f0e5]
                        text-[#55704f]
                        text-2xl
                        font-bold
                      "
                    >
                      ✓
                    </div>


                    <h3
                      className="
                        mt-4
                        text-center
                        text-xl
                        font-semibold
                        text-[#543550]
                      "
                    >
                      Descarga completada
                    </h3>


                    <p
                      className="
                        mt-2
                        text-center
                        text-sm
                        text-[#82697d]
                      "
                    >

                      Se procesaron
                      {" "}
                      {downloadCurrent}
                      {" "}
                      fotografías.

                    </p>


                    <button
                      type="button"
                      onClick={
                        closeDownloadModal
                      }
                      className="
                        mt-5
                        min-h-12
                        w-full
                        rounded-full
                        bg-[#765071]
                        px-5
                        font-semibold
                        text-white
                        transition-all
                        duration-200
                        hover:scale-[1.02]
                        hover:bg-[#5f3e5b]
                      "
                    >
                      Cerrar
                    </button>

                  </>

                )
              }


              {/* =========================================
                  CANCELADA
              ========================================== */}

              {
                downloadStatus ===
                "cancelled" && (

                  <>

                    <div
                      className="
                        mx-auto
                        flex
                        h-14
                        w-14
                        items-center
                        justify-center
                        rounded-full
                        bg-[#f7e4e8]
                        text-[#a4405c]
                      "
                    >

                      <X
                        size={25}
                      />

                    </div>


                    <h3
                      className="
                        mt-4
                        text-center
                        text-xl
                        font-semibold
                        text-[#543550]
                      "
                    >
                      Descarga cancelada
                    </h3>


                    <p
                      className="
                        mt-2
                        text-center
                        text-sm
                        leading-6
                        text-[#82697d]
                      "
                    >

                      {downloadCurrent}
                      {" "}
                      de
                      {" "}
                      {downloadTotal}
                      {" "}
                      fotografías fueron procesadas.

                      <br />

                      Las fotografías ya descargadas
                      permanecen guardadas.

                    </p>


                    <button
                      type="button"
                      onClick={
                        closeDownloadModal
                      }
                      className="
                        mt-5
                        min-h-12
                        w-full
                        rounded-full
                        bg-[#765071]
                        px-5
                        font-semibold
                        text-white
                        transition-all
                        duration-200
                        hover:scale-[1.02]
                        hover:bg-[#5f3e5b]
                      "
                    >
                      Cerrar
                    </button>

                  </>

                )
              }


              {/* =========================================
                  ERROR
              ========================================== */}

              {
                downloadStatus ===
                "error" && (

                  <>

                    <div
                      className="
                        mx-auto
                        flex
                        h-14
                        w-14
                        items-center
                        justify-center
                        rounded-full
                        bg-red-100
                        text-red-600
                        text-xl
                        font-bold
                      "
                    >
                      !
                    </div>


                    <h3
                      className="
                        mt-4
                        text-center
                        text-xl
                        font-semibold
                        text-[#543550]
                      "
                    >
                      Descarga interrumpida
                    </h3>


                    <p
                      className="
                        mt-2
                        text-center
                        text-sm
                        text-[#82697d]
                      "
                    >

                      {downloadCurrent}
                      {" "}
                      de
                      {" "}
                      {downloadTotal}
                      {" "}
                      fotografías fueron procesadas.

                    </p>


                    {
                      downloadError && (

                        <p
                          className="
                            mt-3
                            rounded-xl
                            bg-red-50
                            p-3
                            text-center
                            text-xs
                            text-red-700
                          "
                        >
                          {downloadError}
                        </p>

                      )
                    }


                    <button
                      type="button"
                      onClick={
                        closeDownloadModal
                      }
                      className="
                        mt-5
                        min-h-12
                        w-full
                        rounded-full
                        bg-[#765071]
                        px-5
                        font-semibold
                        text-white
                        transition-all
                        duration-200
                        hover:scale-[1.02]
                        hover:bg-[#5f3e5b]
                      "
                    >
                      Cerrar
                    </button>

                  </>

                )
              }

            </div>

          </div>

        )
      }

    </section>

  );

}