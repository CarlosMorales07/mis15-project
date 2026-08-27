"use client";

import {
  createClient
} from "@supabase/supabase-js";


let browserClient:
  ReturnType<typeof createClient>
  | null =
  null;


export function getSupabaseBrowser() {

  if (!browserClient) {

    browserClient =
      createClient(

        process.env
          .NEXT_PUBLIC_SUPABASE_URL!,

        process.env
          .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,

        {
          auth: {

            persistSession:
              true,

            autoRefreshToken:
              true,

            detectSessionInUrl:
              true

          }
        }

      );

  }

  return browserClient;
}



export async function ensureAnonymousSession() {

  const supabase =
    getSupabaseBrowser();


  const {
    data: {
      session
    }
  } =
    await supabase.auth
      .getSession();


  if (session?.user) {

    localStorage.setItem(
      "mis15_device_session_id",
      session.user.id
    );

    return session;

  }


  const {
    data,
    error
  } =
    await supabase.auth
      .signInAnonymously();


  if (
    error ||
    !data.session
  ) {

    throw new Error(
      error?.message ??
      "No se pudo iniciar la sesión."
    );

  }


  localStorage.setItem(
    "mis15_device_session_id",
    data.session.user.id
  );


  return data.session;

}



export async function getAccessToken() {

  const supabase =
    getSupabaseBrowser();


  const {
    data: {
      session
    }
  } =
    await supabase.auth
      .getSession();


  if (!session) {

    const newSession =
      await ensureAnonymousSession();

    return newSession
      .access_token;

  }


  return session
    .access_token;

}