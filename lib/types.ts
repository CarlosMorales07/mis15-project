export type Photo = {
  id: string;
  owner_id: string;
  cloudinary_public_id: string;
  secure_url: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
  favorite_count: number;
  is_featured: boolean;
  created_at: string;
};