/**
 * Knowledge category registry.
 * Maps the raw Excel sheet keys to structured category metadata.
 */

import type { KnowledgeCategory, KnowledgeCategoryInfo } from "@/types/knowledge";

/** Map of sheet keys to their category ID. */
export const SHEET_TO_CATEGORY: Record<string, KnowledgeCategory[]> = {
  "Filler+Botox+Threads": ["fillers", "botox", "threads", "body-fillers"],
  "Laser ": ["laser"],
  "Hair+face Treatments  ": ["hair-treatments", "face-treatments"],
  "Skin Booster ": ["skin-boosters"],
  "Facial ": ["facial"],
  "Tattoo Removal": ["tattoo-removal"],
  "pregnancy and lactation": ["pregnancy-safety"],
  "Slimming ": ["slimming"],
  "Facial Machines  ": ["facial-machines"],
  "Dental": ["dental"],
};

/** Category display info. */
export const CATEGORIES: Record<KnowledgeCategory, Omit<KnowledgeCategoryInfo, "recordCount">> = {
  fillers: {
    id: "fillers",
    nameAr: "الفيلر",
    nameEn: "Dermal Fillers",
    description: "Injectable fillers for wrinkles, volume restoration, and facial contouring",
    icon: "Droplets",
  },
  botox: {
    id: "botox",
    nameAr: "البوتوكس",
    nameEn: "Botox",
    description: "Botulinum toxin for wrinkle reduction and medical treatments",
    icon: "Sparkles",
  },
  threads: {
    id: "threads",
    nameAr: "الخيوط",
    nameEn: "Face Threads",
    description: "PDO thread lifting for skin tightening and collagen stimulation",
    icon: "Layers",
  },
  "body-fillers": {
    id: "body-fillers",
    nameAr: "فيلر الجسم",
    nameEn: "Body Fillers",
    description: "Body contouring fillers for non-surgical volume and shaping",
    icon: "User",
  },
  laser: {
    id: "laser",
    nameAr: "الليزر",
    nameEn: "Laser Hair Removal",
    description: "Laser devices, instructions, and FAQs for hair removal",
    icon: "Zap",
  },
  "hair-treatments": {
    id: "hair-treatments",
    nameAr: "علاجات الشعر والبشرة",
    nameEn: "Hair & Face Treatments",
    description: "Dr. CYJ hair filler, PRP, stem cells, and mesotherapy for hair and face",
    icon: "Scissors",
  },
  "face-treatments": {
    id: "face-treatments",
    nameAr: "علاجات الوجه",
    nameEn: "Face Treatments",
    description: "Mesotherapy, PRP, and stem cell treatments for the face",
    icon: "Heart",
  },
  "skin-boosters": {
    id: "skin-boosters",
    nameAr: "حقن النضارة",
    nameEn: "Skin Boosters",
    description: "Hyaluronic acid and collagen-stimulating skin boosters",
    icon: "Droplet",
  },
  facial: {
    id: "facial",
    nameAr: "الفيشال",
    nameEn: "Facial Treatments",
    description: "Hydrafacial, Dermapen, peeling, and skincare treatments",
    icon: "Flower2",
  },
  "tattoo-removal": {
    id: "tattoo-removal",
    nameAr: "إزالة التاتو",
    nameEn: "Tattoo Removal",
    description: "Q-Switch laser tattoo removal devices and procedures",
    icon: "Eraser",
  },
  "pregnancy-safety": {
    id: "pregnancy-safety",
    nameAr: "الحمل والرضاعة",
    nameEn: "Pregnancy & Lactation",
    description: "Treatment safety matrix during pregnancy and breastfeeding",
    icon: "ShieldCheck",
  },
  slimming: {
    id: "slimming",
    nameAr: "التنحيف",
    nameEn: "Slimming & Body Contouring",
    description: "Weight management, fat reduction, and body sculpting",
    icon: "Activity",
  },
  "facial-machines": {
    id: "facial-machines",
    nameAr: "أجهزة الوجه",
    nameEn: "Facial Machines & Devices",
    description: "Vivace, Clear+Brilliant, OxyGeneo, CO2 laser, and more",
    icon: "Cpu",
  },
  dental: {
    id: "dental",
    nameAr: "الأسنان",
    nameEn: "Dental Services",
    description: "Veneers, night guards, and dental procedures",
    icon: "SmilePlus",
  },
};

/** Get category info by ID. */
export function getCategoryInfo(id: KnowledgeCategory): Omit<KnowledgeCategoryInfo, "recordCount"> {
  return CATEGORIES[id];
}

/** Get all categories as an array. */
export function getAllCategories(): Omit<KnowledgeCategoryInfo, "recordCount">[] {
  return Object.values(CATEGORIES);
}

