export type PetMenuCategory = 'food' | 'drink' | 'treat' | 'freebie';

export interface PetMenuItem {
  id: string;
  name: string;
  category: PetMenuCategory;
  price?: number | string | null;
  notes?: string;
}

export interface PetMenuDetails {
  has_pet_menu: 'yes' | 'no' | 'water_bowl_only';
  items?: PetMenuItem[];
  notes?: string;
  updated_at?: string;
}

export type MenuPhotoCategory = 'pet_menu' | 'regular_menu';

export interface MenuPhoto {
  id: string;
  url: string;
  category: MenuPhotoCategory;
  caption?: string;
  uploaded_at: string;
  device_id?: string;
}
