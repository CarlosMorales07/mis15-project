import {
  NextResponse
} from "next/server";

import {
  cloudinary
} from "@/lib/cloudinary";

import {
  requireUser
} from "@/lib/server-auth";

import {
  verifyUploadTicket
} from "@/lib/upload-ticket";


export const runtime =
  "nodejs";


export async function POST(
  request: Request
) {

  try {

    const {
      user,
      supabase
    } =
      await requireUser(
        request
      );


    const body =
      await request.json();


    const ticket =
      verifyUploadTicket(
        body.ticket
      );


    if (
      !ticket ||

      ticket.userId !==
        user.id ||

      ticket.publicId !==
        body.publicId
    ) {

      return NextResponse.json(

        {
          error:
            "Ticket inválido."
        },

        {
          status:
            403
        }

      );

    }


    /*
      Consultamos directamente
      Cloudinary.

      Así NO confiamos en dimensiones,
      URL ni tamaño enviados por
      el navegador.
    */

    const resource =
      await cloudinary
        .api
        .resource(

          body.publicId,

          {
            resource_type:
              "image"
          }

        );


    const {
      data,
      error
    } =
      await supabase

        .from(
          "photos"
        )

        .insert({

          owner_id:
            user.id,

          cloudinary_public_id:
            resource.public_id,

          secure_url:
            resource.secure_url,

          width:
            resource.width,

          height:
            resource.height,

          bytes:
            resource.bytes,

          format:
            resource.format

        })

        .select("*")

        .single();


    if (error) {

      return NextResponse.json(

        {
          error:
            error.message
        },

        {
          status:
            500
        }

      );

    }


    return NextResponse.json({

      photo:
        data

    });


  } catch (
    error
  ) {

    console.error(
      error
    );


    return NextResponse.json(

      {
        error:
          "No autorizado."
      },

      {
        status:
          401
      }

    );

  }

}