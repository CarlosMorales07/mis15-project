import {
  NextResponse
} from "next/server";

import {
  createClient
} from "@supabase/supabase-js";

import {
  cloudinary
} from "@/lib/cloudinary";

import {
  requireUser
} from "@/lib/server-auth";


export const runtime =
  "nodejs";


type PhotoDeleteRow = {
  id: string;
  owner_id: string;
  cloudinary_public_id: string;
};


type DeleteRequestBody = {
  id?: string;
};


export async function POST(
  request: Request
) {

  try {

    /*
     * =====================================================
     * 1. VALIDAR USUARIO
     * =====================================================
     */

    const {
      user
    } =
      await requireUser(
        request
      );


    /*
     * =====================================================
     * 2. LEER ID DESDE EL BODY
     * =====================================================
     */

    const body =
      (
        await request.json()
      ) as DeleteRequestBody;


    const id =
      body.id;


    if (
      !id ||
      typeof id !==
        "string"
    ) {

      return NextResponse.json(
        {
          error:
            "ID de fotografía inválido."
        },
        {
          status: 400
        }
      );

    }


    /*
     * =====================================================
     * 3. CLIENTE ADMINISTRATIVO
     * =====================================================
     *
     * SERVICE ROLE solamente se usa
     * dentro del servidor.
     */

    const adminSupabase =
      createClient(

        process.env
          .NEXT_PUBLIC_SUPABASE_URL!,

        process.env
          .SUPABASE_SERVICE_ROLE_KEY!,

        {
          auth: {
            persistSession: false,
            autoRefreshToken: false
          }
        }

      );


    /*
     * =====================================================
     * 4. BUSCAR FOTO
     * =====================================================
     */

    const {
      data:
        photoData,

      error:
        photoError
    } =
      await adminSupabase

        .from(
          "photos"
        )

        .select(
          "id, owner_id, cloudinary_public_id"
        )

        .eq(
          "id",
          id
        )

        .maybeSingle();


    if (
      photoError
    ) {

      console.error(
        "PHOTO LOOKUP ERROR:",
        photoError
      );


      return NextResponse.json(
        {
          error:
            `Error consultando foto: ${photoError.message}`
        },
        {
          status: 500
        }
      );

    }


    if (
      !photoData
    ) {

      return NextResponse.json(
        {
          error:
            "La fotografía no existe."
        },
        {
          status: 404
        }
      );

    }


    const photo =
      photoData as PhotoDeleteRow;


    /*
     * =====================================================
     * 5. COMPROBAR PROPIETARIO
     * =====================================================
     */

    if (
      photo.owner_id !==
      user.id
    ) {

      return NextResponse.json(
        {
          error:
            "Solo puedes eliminar las fotografías que tú subiste."
        },
        {
          status: 403
        }
      );

    }


    /*
     * =====================================================
     * 6. ELIMINAR FAVORITOS
     * =====================================================
     */

    const {
      error:
        favoritesDeleteError
    } =
      await adminSupabase

        .from(
          "favorites"
        )

        .delete()

        .eq(
          "photo_id",
          photo.id
        );


    if (
      favoritesDeleteError
    ) {

      console.error(
        "FAVORITES DELETE ERROR:",
        favoritesDeleteError
      );


      return NextResponse.json(
        {
          error:
            `No se pudieron eliminar los favoritos: ${favoritesDeleteError.message}`
        },
        {
          status: 500
        }
      );

    }


    /*
     * =====================================================
     * 7. ELIMINAR FOTO DE SUPABASE
     * =====================================================
     */

    const {
      error:
        photoDeleteError
    } =
      await adminSupabase

        .from(
          "photos"
        )

        .delete()

        .eq(
          "id",
          photo.id
        );


    if (
      photoDeleteError
    ) {

      console.error(
        "PHOTO DELETE ERROR:",
        photoDeleteError
      );


      return NextResponse.json(
        {
          error:
            `No se pudo eliminar la fotografía: ${photoDeleteError.message}`
        },
        {
          status: 500
        }
      );

    }


    /*
     * =====================================================
     * 8. ELIMINAR DE CLOUDINARY
     * =====================================================
     */

    try {

      const result =
        await cloudinary
          .uploader
          .destroy(

            photo.cloudinary_public_id,

            {
              resource_type:
                "image",

              invalidate:
                true
            }

          );


      console.log(
        "CLOUDINARY DELETE:",
        result
      );


    } catch (
      cloudinaryError
    ) {

      console.error(
        "CLOUDINARY DELETE ERROR:",
        cloudinaryError
      );

      /*
       * La foto ya fue eliminada
       * de la aplicación.
       *
       * No hacemos fallar la respuesta
       * por un problema secundario
       * de limpieza en Cloudinary.
       */

    }


    /*
     * =====================================================
     * 9. RESPUESTA CORRECTA
     * =====================================================
     */

    return NextResponse.json(
      {
        ok: true,
        message:
          "Fotografía eliminada correctamente."
      },
      {
        status: 200
      }
    );


  } catch (
    error
  ) {

    console.error(
      "DELETE PHOTO ERROR:",
      error
    );


    if (
      error instanceof Error &&
      error.message ===
        "UNAUTHORIZED"
    ) {

      return NextResponse.json(
        {
          error:
            "Tu sesión no es válida."
        },
        {
          status: 401
        }
      );

    }


    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ocurrió un error al eliminar la fotografía."
      },
      {
        status: 500
      }
    );

  }

}