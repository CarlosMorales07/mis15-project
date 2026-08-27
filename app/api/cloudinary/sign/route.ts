import {
  NextResponse
} from "next/server";

import crypto
  from "node:crypto";

import {
  cloudinary
} from "@/lib/cloudinary";

import {
  requireUser
} from "@/lib/server-auth";

import {
  createUploadTicket
} from "@/lib/upload-ticket";


export const runtime =
  "nodejs";


export async function POST(
  request: Request
) {

  try {

    const {
      user
    } =
      await requireUser(
        request
      );


    const timestamp =
      Math.floor(
        Date.now() /
        1000
      );


    const publicId =
      `mis15/${crypto.randomUUID()}`;


    const signature =
      cloudinary
        .utils
        .api_sign_request(

          {

            timestamp,

            public_id:
              publicId

          },

          process.env
            .CLOUDINARY_API_SECRET!

        );


    const ticket =
      createUploadTicket({

        userId:
          user.id,

        publicId,

        expiresAt:
          Date.now() +
          10 * 60 * 1000

      });


    return NextResponse.json({

      cloudName:
        process.env
          .CLOUDINARY_CLOUD_NAME,

      apiKey:
        process.env
          .CLOUDINARY_API_KEY,

      timestamp,

      publicId,

      signature,

      ticket

    });


  } catch {

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