import {
  v2 as cloudinary
} from "cloudinary";


cloudinary.config({

  cloud_name:
    process.env
      .CLOUDINARY_CLOUD_NAME!,

  api_key:
    process.env
      .CLOUDINARY_API_KEY!,

  api_secret:
    process.env
      .CLOUDINARY_API_SECRET!,

  secure:
    true

});


export {
  cloudinary
};



export function cloudinaryThumbnail(
  url: string,
  width = 520
) {

  return url.replace(

    "/upload/",

    `/upload/f_auto,q_auto,c_fill,g_auto,w_${width},h_${width}/`

  );

}



export function cloudinaryViewer(
  url: string
) {

  return url.replace(

    "/upload/",

    "/upload/f_auto,q_auto,c_limit,w_1600/"

  );

}