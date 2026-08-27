"use client";

import {
  openDB
} from "idb";


export type UploadQueueItem = {

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
  1;



async function getDb() {

  return openDB(

    DB_NAME,

    VERSION,

    {

      upgrade(
        database
      ) {

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
  item: UploadQueueItem
) {

  const db =
    await getDb();


  await db.put(
    STORE,
    item
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