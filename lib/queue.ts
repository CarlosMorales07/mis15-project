"use client";

import {
  openDB
} from "idb";


export type UploadQueueItem = {

  id:
    string;

  buffer:
    ArrayBuffer;

  mimeType:
    string;

  filename:
    string;

  createdAt:
    number;

};


export type UploadQueueInput = {

  id:
    string;

  blob:
    Blob;

  filename:
    string;

  createdAt:
    number;

};


const DB_NAME =
  "fernanda-mis15";


const STORE =
  "uploadQueue";


const VERSION =
  2;



async function getDb() {

  return openDB(

    DB_NAME,

    VERSION,

    {

      upgrade(
        database,
        oldVersion
      ) {

        /*
         * Si veníamos de la versión anterior,
         * eliminamos la cola antigua para evitar
         * registros con Blob incompatibles.
         */

        if (
          oldVersion <
          2
        ) {

          if (
            database
              .objectStoreNames
              .contains(
                STORE
              )
          ) {

            database
              .deleteObjectStore(
                STORE
              );

          }

        }


        if (
          !database
            .objectStoreNames
            .contains(
              STORE
            )
        ) {

          database
            .createObjectStore(

              STORE,

              {
                keyPath:
                  "id"
              }

            );

        }

      }

    }

  );

}



export async function queueAdd(
  item: UploadQueueInput
) {

  const db =
    await getDb();


  /*
   * Safari/iOS puede fallar almacenando
   * File/Blob directamente en IndexedDB.
   *
   * Convertimos a ArrayBuffer antes de guardar.
   */

  const buffer =
    await item.blob
      .arrayBuffer();


  const queueItem:
    UploadQueueItem = {

    id:
      item.id,

    buffer,

    mimeType:
      item.blob.type ||
      "image/jpeg",

    filename:
      item.filename,

    createdAt:
      item.createdAt

  };


  await db.put(
    STORE,
    queueItem
  );

}



export async function queueAll() {

  const db =
    await getDb();


  return (
    await db.getAll(
      STORE
    )
  ) as UploadQueueItem[];

}



export async function queueDelete(
  id: string
) {

  const db =
    await getDb();


  await db.delete(
    STORE,
    id
  );

}



export async function queueCount() {

  const db =
    await getDb();


  return db.count(
    STORE
  );

}