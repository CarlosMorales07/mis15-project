import { createClient } from "@supabase/supabase-js";


export async function requireUser(
  request: Request
) {

  const authorization =
    request.headers.get(
      "authorization"
    );


  if (
    !authorization?.startsWith(
      "Bearer "
    )
  ) {

    throw new Error(
      "UNAUTHORIZED"
    );

  }


  const token =
    authorization.slice(
      "Bearer ".length
    );


  const supabase =
    createClient(

      process.env
        .NEXT_PUBLIC_SUPABASE_URL!,

      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,

      {

        auth: {

          persistSession:
            false,

          autoRefreshToken:
            false

        },

        global: {

          headers: {

            Authorization:
              `Bearer ${token}`

          }

        }

      }

    );


  const {
    data: {
      user
    },
    error
  } =
    await supabase.auth
      .getUser(token);


  if (
    error ||
    !user
  ) {

    throw new Error(
      "UNAUTHORIZED"
    );

  }


  return {

    user,

    supabase,

    token

  };

}