import {
  createHmac,
  timingSafeEqual
} from "node:crypto";


type TicketPayload = {

  userId:
    string;

  publicId:
    string;

  expiresAt:
    number;

};



function getSecret() {

  const secret =
    process.env
      .UPLOAD_TICKET_SECRET;


  if (
    !secret ||
    secret.length < 32
  ) {

    throw new Error(
      "UPLOAD_TICKET_SECRET inválido."
    );

  }


  return secret;

}



function sign(
  payload: string
) {

  return createHmac(
    "sha256",
    getSecret()
  )
    .update(payload)
    .digest("base64url");

}



export function createUploadTicket(
  payload: TicketPayload
) {

  const encoded =
    Buffer
      .from(
        JSON.stringify(payload)
      )
      .toString(
        "base64url"
      );


  return (
    `${encoded}.${sign(encoded)}`
  );

}



export function verifyUploadTicket(
  ticket: string
):
  TicketPayload |
  null {

  const [
    encoded,
    signature
  ] =
    ticket.split(".");


  if (
    !encoded ||
    !signature
  ) {

    return null;

  }


  const expected =
    sign(encoded);


  const a =
    Buffer.from(
      signature
    );


  const b =
    Buffer.from(
      expected
    );


  if (
    a.length !==
      b.length ||

    !timingSafeEqual(
      a,
      b
    )
  ) {

    return null;

  }


  try {

    const payload =
      JSON.parse(

        Buffer
          .from(
            encoded,
            "base64url"
          )
          .toString(
            "utf8"
          )

      ) as TicketPayload;


    if (
      payload.expiresAt <
      Date.now()
    ) {

      return null;

    }


    return payload;


  } catch {

    return null;

  }

}