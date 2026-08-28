"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import type {
  ReactNode
} from "react";

import {
  createPortal
} from "react-dom";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  Images,
  LoaderCircle,
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


type NoticeState = {

  title:
    string;

  message:
    string;

  tone:
    "error" |
    "info";

} | null;


const DOWNLOAD_BATCH_SIZE =
  30;


/* =========================================================
   PORTAL
   ========================================================= */

function ModalPortal({
  children
}: {
  children: ReactNode;
}) {

  const [
    mounted,
    setMounted
  ] =
    useState(false);


  useEffect(
    () => {

      setMounted(
        true
      );

      return () => {

        setMounted(
          false
        );

      };

    },
    []
  );


  if (
    !mounted
  ) {

    return null;

  }


  return createPortal(
    children,
    document.body
  );

}


/* =========================================================
   CLOUDINARY
   ========================================================= */

function getThumbnailUrl(
  url: string,
  width = 520
) {

  return url.replace(
    "/upload/",
    `/upload/f_auto,q_auto,c_fill,g_auto,w_${width},h_${width}/`
  );

}

function getViewerPreviewUrl(
  url: string
) {

  return url.replace(
    "/upload/",
    "/upload/f_auto,q_auto:low,c_limit,w_700/"
  );

}

function getViewerUrl(
  url: string
) {

  const isMobile =
    typeof window !==
      "undefined" &&
    window.innerWidth <
      768;


  const width =
    isMobile
      ? 1100
      : 1800;


  return url.replace(
    "/upload/",
    `/upload/f_auto,q_auto:good,c_limit,w_${width}/`
  );

}


/* =========================================================
   NOMBRE DE ARCHIVO
   ========================================================= */

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


/* =========================================================
   PAUSA
   ========================================================= */

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


/* =========================================================
   DESCARGA DIRECTA
   ========================================================= */

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
    5000
  );

}


/* =========================================================
   DETECTAR MÓVIL
   ========================================================= */

function isMobileLikeDevice() {

  if (
    typeof window ===
    "undefined"
  ) {

    return false;

  }


  return (
    navigator.maxTouchPoints >
      0 &&
    window
      .matchMedia(
        "(pointer: coarse)"
      )
      .matches
  );

}

function isIOSDevice() {

  if (
    typeof navigator ===
    "undefined"
  ) {

    return false;

  }


  const userAgent =
    navigator.userAgent;


  const classicIOS =
    /iPad|iPhone|iPod/i.test(
      userAgent
    );


  const modernIPad =
    navigator.platform ===
      "MacIntel" &&
    navigator.maxTouchPoints >
      1;


  return (
    classicIOS ||
    modernIPad
  );

}


/* =========================================================
   FETCH DE FOTO CON REINTENTOS
   ========================================================= */

async function fetchPhotoWithRetry(
  url: string,
  attempts = 4
) {

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
          url,
          {
            mode:
              "cors",

            cache:
              "no-store"
          }
        );


      if (
        !response.ok
      ) {

        throw new Error(
          `HTTP ${response.status}`
        );

      }


      return response;


    } catch (
      error
    ) {

      lastError =
        error;


      console.warn(
        `Descarga de imagen - intento ${attempt} de ${attempts}:`,
        error
      );


      if (
        attempt <
        attempts
      ) {

        await delay(
          800 *
          attempt
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
    "No se pudo obtener la fotografía."
  );

}


/* =========================================================
   FOTO → FILE
   ========================================================= */

async function photoToFile(
  photo: Photo
) {

  const response =
    await fetchPhotoWithRetry(
      photo.secure_url
    );


  const blob =
    await response.blob();


  return new File(
    [
      blob
    ],
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


/* =========================================================
   GUARDAR UNA FOTO
   ========================================================= */

async function savePhoto(
  photo: Photo
) {

  const file =
    await photoToFile(
      photo
    );


  if (
    isMobileLikeDevice() &&
    typeof navigator.share ===
      "function" &&
    typeof navigator.canShare ===
      "function" &&
    navigator.canShare({
      files:
        [file]
    })
  ) {

    try {

      await navigator.share({
        files:
          [file],

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


      console.warn(
        "Share falló, usando descarga directa:",
        error
      );

    }

  }


  downloadBlob(
    file,
    file.name
  );

}


/* =========================================================
   COMPONENTE
   ========================================================= */

export default function Gallery() {

  const supabase =
    useMemo(
      () =>
        getSupabaseBrowser(),
      []
    );


  /* =======================================================
     GALERÍA
     ======================================================= */

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
    viewerLoading,
    setViewerLoading
  ] =
    useState(false);


  const [
    viewerError,
    setViewerError
  ] =
    useState(false);


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


  const [
    notice,
    setNotice
  ] =
    useState<NoticeState>(
      null
    );


  /* =======================================================
     ELIMINACIÓN
     ======================================================= */

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


  /* =======================================================
     SELECCIÓN
     ======================================================= */

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


  /* =======================================================
     DESCARGA MASIVA
     ======================================================= */

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


  /* =======================================================
     BLOQUEAR SCROLL CUANDO HAY MODAL
     ======================================================= */

  const modalIsOpen =
    Boolean(
      openPhoto ||
      deleteCandidate ||
      notice ||
      downloadStatus !==
        "idle"
    );


useEffect(
  () => {

    if (
      !modalIsOpen
    ) {

      return;

    }


    const scrollY =
      window.scrollY;


    const body =
      document.body;


    const html =
      document.documentElement;


    const previousPosition =
      body.style.position;

    const previousTop =
      body.style.top;

    const previousLeft =
      body.style.left;

    const previousRight =
      body.style.right;

    const previousWidth =
      body.style.width;

    const previousOverflow =
      body.style.overflow;

    const previousHtmlOverflow =
      html.style.overflow;

    const previousScrollBehavior =
      html.style.scrollBehavior;


    body.style.position =
      "fixed";

    body.style.top =
      `-${scrollY}px`;

    body.style.left =
      "0";

    body.style.right =
      "0";

    body.style.width =
      "100%";

    body.style.overflow =
      "hidden";


    html.style.overflow =
      "hidden";


    return () => {

      /*
       * Impedir que scroll-behavior:smooth
       * anime la restauración.
       */

      html.style.scrollBehavior =
        "auto";


      html.style.overflow =
        previousHtmlOverflow;


      body.style.position =
        previousPosition;

      body.style.top =
        previousTop;

      body.style.left =
        previousLeft;

      body.style.right =
        previousRight;

      body.style.width =
        previousWidth;

      body.style.overflow =
        previousOverflow;


      window.scrollTo(
        0,
        scrollY
      );


      window.requestAnimationFrame(
        () => {

          html.style.scrollBehavior =
            previousScrollBehavior;

        }
      );

    };

  },

  [
    modalIsOpen
  ]
);


  /* =======================================================
     ESTADO DEL VISOR
     ======================================================= */

  useEffect(
    () => {

      if (
        openPhoto
      ) {

        setViewerLoading(
          true
        );


        setViewerError(
          false
        );

      }

    },
    [
      openPhoto?.id
    ]
  );


  /* =======================================================
     CARGAR GALERÍA
     ======================================================= */

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


  /* =======================================================
     ACTUALIZACIÓN AUTOMÁTICA
     ======================================================= */

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


  /* =======================================================
     FAVORITOS
     ======================================================= */

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


        setNotice({
          title:
            "No se pudo actualizar",

          message:
            "No pudimos quitar el favorito. Inténtalo nuevamente.",

          tone:
            "error"
        });


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


      setNotice({
        title:
          "No se pudo actualizar",

        message:
          "No pudimos marcar esta fotografía como favorita.",

        tone:
          "error"
      });


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


  /* =======================================================
     GUARDAR UNA
     ======================================================= */

  async function handleSavePhoto(
    photo: Photo
  ) {

    try {

      await savePhoto(
        photo
      );


    } catch (
      error
    ) {

      console.error(
        "Error guardando fotografía:",
        error
      );


      setNotice({
        title:
          "No se pudo guardar",

        message:
          "La fotografía no pudo descargarse en este momento. Revisa tu conexión e inténtalo nuevamente.",

        tone:
          "error"
      });

    }

  }


  /* =======================================================
     ELIMINAR
     ======================================================= */

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


      setDeleteCandidate(
        null
      );


      setNotice({
        title:
          "No se pudo eliminar",

        message:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar la fotografía.",

        tone:
          "error"
      });


    } finally {

      setDeletingPhotoId(
        null
      );

    }

  }


  /* =======================================================
     FILTROS
     ======================================================= */

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


  /* =======================================================
     SELECCIÓN
     ======================================================= */

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


  /* =======================================================
     DESCARGA MASIVA
     ======================================================= */

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
      [
        ...targetPhotos
      ]
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


  async function confirmBulkDownload() {

  const targetPhotos =
    [
      ...pendingDownloadPhotos
    ];


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


  /*
   * =====================================================
   * IPHONE / IPAD
   * =====================================================
   *
   * En iOS evitamos múltiples descargas del navegador.
   *
   * Preparamos todas las imágenes y abrimos UNA VEZ
   * el menú nativo del sistema.
   */

  if (
    isIOSDevice() &&
    typeof navigator.share ===
      "function" &&
    typeof navigator.canShare ===
      "function"
  ) {

    try {

      const files:
        File[] = [];


      for (
        let index = 0;
        index <
          targetPhotos.length;
        index += 1
      ) {

        if (
          cancelDownloadRef.current
        ) {

          setDownloadStatus(
            "cancelled"
          );


          return;

        }


        const file =
          await photoToFile(
            targetPhotos[index]
          );


        files.push(
          file
        );


        setDownloadCurrent(
          index +
          1
        );

      }


      const canShareFiles =
        navigator.canShare({
          files
        });


      if (
        !canShareFiles
      ) {

        throw new Error(
          "El dispositivo no permite compartir este conjunto de fotografías."
        );

      }


      /*
       * IMPORTANTE:
       *
       * Esta es una sola interacción nativa.
       *
       * En iPhone aparecerá el menú donde
       * puede elegirse Guardar imágenes.
       */

      await navigator.share({

        files,

        title:
          "Recuerdos de los 15 de Fernanda"

      });


      setDownloadStatus(
        "completed"
      );


      return;


    } catch (
      error
    ) {

      /*
       * El usuario cerró voluntariamente
       * el menú de compartir.
       */

      if (
        error instanceof DOMException &&
        error.name ===
          "AbortError"
      ) {

        setDownloadStatus(
          "cancelled"
        );


        return;

      }


      console.error(
        "Error compartiendo fotografías en iOS:",
        error
      );


      setDownloadError(
        "No fue posible preparar todas las fotografías para guardarlas."
      );


      setDownloadStatus(
        "error"
      );


      return;

    }

  }


  /*
   * =====================================================
   * PC / OTROS DISPOSITIVOS
   * =====================================================
   */

  let downloaded =
    0;


  try {

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


  function cancelBulkDownload() {

    cancelDownloadRef.current =
      true;

  }


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


  /* =======================================================
     NAVEGACIÓN VISOR
     ======================================================= */

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

  /* =======================================================
   PRECARGAR FOTO ANTERIOR Y SIGUIENTE
   ======================================================= */


  useEffect(
  () => {

    if (
      !openPhoto ||
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


    const nextIndex =
      currentPhotoIndex >=
        visiblePhotos.length -
          1
        ? 0
        : currentPhotoIndex +
          1;


    const previousPhoto =
      visiblePhotos[
        previousIndex
      ];


    const nextPhoto =
      visiblePhotos[
        nextIndex
      ];


    if (
      previousPhoto
    ) {

      const previousImage =
        new Image();


      previousImage.src =
        getViewerUrl(
          previousPhoto.secure_url
        );

    }


    if (
      nextPhoto
    ) {

      const nextImage =
        new Image();


      nextImage.src =
        getViewerUrl(
          nextPhoto.secure_url
        );

    }

  },

  [
    openPhoto?.id,
    currentPhotoIndex,
    visiblePhotos
  ]
);

  /* =======================================================
     TECLADO
     ======================================================= */

  useEffect(
    () => {

      if (
        !openPhoto ||
        deleteCandidate ||
        notice ||
        downloadStatus !==
          "idle"
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

          openPreviousPhoto();

        }


        if (
          event.key ===
          "ArrowRight"
        ) {

          openNextPhoto();

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
      deleteCandidate,
      notice,
      downloadStatus,
      currentPhotoIndex,
      visiblePhotos
    ]
  );


  /* =======================================================
     LOADING
     ======================================================= */

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


  /* =======================================================
     UI
     ======================================================= */

  return (

    <section
      className="mt-8"
    >

      {/* ENCABEZADO */}

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


      {/* ERROR GENERAL */}

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


      {/* PESTAÑAS */}

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


      {/* SELECCIÓN */}

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
                      "
                    >
                      Quitar selección
                    </button>

                  )
                }


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
                    disabled:opacity-50
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
                  "
                >
                  Cancelar
                </button>

              </div>

            </div>

          </div>

        )
      }


      {/* INFORMACIÓN */}

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
            </strong>{" "}
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


      {/* GALERÍA */}

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

                                  ${
                                    isSelected
                                      ? "bg-[#765071]/25"
                                      : "bg-black/5"
                                  }
                                `}
                              />

                            )
                          }

                        </button>


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
          VISOR REALMENTE FULLSCREEN
      ==================================================== */}

      {
        openPhoto &&
        !selectionMode && (

          <ModalPortal>

            <div
              className="
                fixed
                inset-0
                z-[9999]
                h-[100dvh]
                w-screen
                overflow-hidden
                bg-black/95
              "
              role="dialog"
              aria-modal="true"
            >

              <div
                className="
                  flex
                  h-full
                  w-full
                  flex-col
                  px-3
                  pb-[calc(env(safe-area-inset-bottom)+12px)]
                  pt-[calc(env(safe-area-inset-top)+12px)]
                  sm:px-6
                "
              >

                {/* CABECERA */}

                <div
                  className="
                    relative
                    z-20
                    flex
                    shrink-0
                    justify-end
                  "
                >

                  <button
                    type="button"
                    onClick={
                      () =>
                        setOpenPhoto(
                          null
                        )
                    }
                    className="
                      flex
                      h-12
                      w-12
                      items-center
                      justify-center
                      rounded-full
                      bg-white
                      text-[#543550]
                      shadow-xl
                    "
                  >

                    <X
                      size={25}
                    />

                  </button>

                </div>


                {/* IMAGEN */}

                <div
                  className="
                    relative
                    min-h-0
                    flex-1
                    overflow-hidden
                  "
                >


                  {
                    viewerError && (

                      <div
                        className="
                          absolute
                          inset-0
                          flex
                          items-center
                          justify-center
                          px-12
                          text-center
                          text-white
                        "
                      >
                        No pudimos cargar esta fotografía.
                      </div>

                    )
                  }


{/* VERSIÓN LIGERA INMEDIATA */}

<img
  key={
    `preview-${openPhoto.id}`
  }
  src={
    getViewerPreviewUrl(
      openPhoto.secure_url
    )
  }
  alt=""
  aria-hidden="true"
  className={`
    absolute
    inset-0
    h-full
    w-full
    select-none
    object-contain
    transition-opacity
    duration-300

    ${
      viewerLoading
        ? "opacity-100"
        : "opacity-0"
    }
  `}
/>


{/* VERSIÓN DE ALTA CALIDAD */}

<img
  key={
    openPhoto.id
  }
  src={
    getViewerUrl(
      openPhoto.secure_url
    )
  }
  alt="Recuerdo ampliado"
  onLoad={
    () => {

      setViewerLoading(
        false
      );

      setViewerError(
        false
      );

    }
  }
  onError={
    () => {

      setViewerLoading(
        false
      );

      setViewerError(
        true
      );

    }
  }
  className={`
    absolute
    inset-0
    h-full
    w-full
    select-none
    object-contain
    transition-opacity
    duration-300

    ${
      viewerLoading
        ? "opacity-0"
        : "opacity-100"
    }
  `}
/>


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
                          left-1
                          top-1/2
                          z-20
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
                          sm:left-4
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
                          right-1
                          top-1/2
                          z-20
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
                          sm:right-4
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

                </div>


                {/* ACCIONES */}

                <div
                  className="
                    relative
                    z-20
                    mt-3
                    flex
                    shrink-0
                    flex-wrap
                    justify-center
                    gap-2
                  "
                >

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


                  <button
                    type="button"
                    onClick={
                      () =>
                        void handleSavePhoto(
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
                    "
                  >

                    <Download
                      size={19}
                    />

                    Guardar

                  </button>


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

          </ModalPortal>

        )
      }


      {/* ===================================================
          MODAL ELIMINAR
      ==================================================== */}

      {
        deleteCandidate && (

          <ModalPortal>

            <div
              className="
                fixed
                inset-0
                z-[10000]
                flex
                h-[100dvh]
                w-screen
                items-center
                justify-center
                overflow-hidden
                bg-black/70
                p-4
                backdrop-blur-md
              "
              role="dialog"
              aria-modal="true"
            >

              <div
                className="
                  w-full
                  max-w-sm
                  rounded-[30px]
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
                    text-2xl
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

          </ModalPortal>

        )
      }


      {/* ===================================================
          MODAL DESCARGA
      ==================================================== */}

      {
        downloadStatus !==
        "idle" && (

          <ModalPortal>

            <div
              className="
                fixed
                inset-0
                z-[10000]
                flex
                h-[100dvh]
                w-screen
                items-center
                justify-center
                overflow-hidden
                bg-black/70
                p-4
                backdrop-blur-md
              "
              role="dialog"
              aria-modal="true"
            >

              <div
                className="
                  max-h-[calc(100dvh-32px)]
                  w-full
                  max-w-md
                  overflow-y-auto
                  rounded-[30px]
                  bg-[#fffaf4]
                  p-6
                  shadow-2xl
                "
              >

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
                          text-2xl
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
                        Vas a descargar{" "}
                        <strong>
                          {pendingDownloadPhotos.length}
                        </strong>{" "}
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
                          el proceso puede tardar algunos minutos.
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

                        <LoaderCircle
                          size={27}
                          className="
                            animate-spin
                          "
                        />

                      </div>


                      <h3
                        className="
                          mt-4
                          text-center
                          text-2xl
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
                        "
                      >
                        Cancelar descarga
                      </button>

                    </>

                  )
                }


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
                          text-2xl
                          font-bold
                          text-[#55704f]
                        "
                      >
                        ✓
                      </div>


                      <h3
                        className="
                          mt-4
                          text-center
                          text-2xl
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
                        Se procesaron{" "}
                        {downloadCurrent}{" "}
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
                        "
                      >
                        Cerrar
                      </button>

                    </>

                  )
                }


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
                          text-2xl
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
                        "
                      >
                        Cerrar
                      </button>

                    </>

                  )
                }


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
                        "
                      >
                        <AlertTriangle
                          size={27}
                        />
                      </div>


                      <h3
                        className="
                          mt-4
                          text-center
                          text-2xl
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
                              leading-5
                              text-red-700
                            "
                          >
                            No fue posible completar todas las descargas.
                            Revisa tu conexión e inténtalo nuevamente.
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
                        "
                      >
                        Cerrar
                      </button>

                    </>

                  )
                }

              </div>

            </div>

          </ModalPortal>

        )
      }


      {/* ===================================================
          AVISO GENERAL
      ==================================================== */}

      {
        notice && (

          <ModalPortal>

            <div
              className="
                fixed
                inset-0
                z-[11000]
                flex
                h-[100dvh]
                w-screen
                items-center
                justify-center
                overflow-hidden
                bg-black/70
                p-4
                backdrop-blur-md
              "
              role="dialog"
              aria-modal="true"
            >

              <div
                className="
                  w-full
                  max-w-sm
                  rounded-[30px]
                  bg-[#fffaf4]
                  p-6
                  text-center
                  shadow-2xl
                "
              >

                <div
                  className={`
                    mx-auto
                    flex
                    h-16
                    w-16
                    items-center
                    justify-center
                    rounded-full

                    ${
                      notice.tone === "error"
                        ? "bg-red-100 text-red-600"
                        : "bg-[#eee4f2] text-[#765071]"
                    }
                  `}
                >

                  <AlertTriangle
                    size={28}
                  />

                </div>


                <h3
                  className="
                    mt-5
                    text-2xl
                    font-semibold
                    text-[#543550]
                  "
                >
                  {notice.title}
                </h3>


                <p
                  className="
                    mt-3
                    text-sm
                    leading-6
                    text-[#82697d]
                  "
                >
                  {notice.message}
                </p>


                <button
                  type="button"
                  onClick={
                    () =>
                      setNotice(
                        null
                      )
                  }
                  className="
                    mt-6
                    min-h-12
                    w-full
                    rounded-full
                    bg-[#765071]
                    px-5
                    font-semibold
                    text-white
                  "
                >
                  Cerrar
                </button>

              </div>

            </div>

          </ModalPortal>

        )
      }

    </section>

  );

}