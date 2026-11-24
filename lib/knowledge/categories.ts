/**
 * Knowledge category registry.
 * Maps canonical category IDs to bilingual display metadata.
 */

import type { KnowledgeCategory, KnowledgeCategoryInfo } from "@/types/knowledge";

/** Map of Excel sheet keys to primary category IDs. */
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
    description: "Injectable hyaluronic & calcium fillers for wrinkles, volume, and facial contouring",
    icon: "Droplets",
  },
  botox: {
    id: "botox",
    nameAr: "البوتوكس",
    nameEn: "Botox",
    description: "Botulinum toxin brands (Botox, Dysport, Nabota, Xeomin) and medical uses",
    icon: "Sparkles",
  },
  threads: {
    id: "threads",
    nameAr: "الخيوط",
    nameEn: "Face Threads",
    description: "PDO, Lifting, Mono, and Aptos threads with verified pricing",
    icon: "Layers",
  },
  "body-fillers": {
    id: "body-fillers",
    nameAr: "فيلر الجسم",
    nameEn: "Body Fillers",
    description: "Non-surgical body contouring fillers (Goldfill, Jealfil, Privilege)",
    icon: "User",
  },
  laser: {
    id: "laser",
    nameAr: "الليزر",
    nameEn: "Laser Hair Removal",
    description: "Laser hair removal devices, protocols, contraindications, and FAQs",
    icon: "Zap",
  },
  "hair-treatments": {
    id: "hair-treatments",
    nameAr: "علاجات الشعر",
    nameEn: "Hair Treatments",
    description: "Dr. CYJ Hair Filler, PRP hair protocols, and hair injection comparisons",
    icon: "Scissors",
  },
  "face-treatments": {
    id: "face-treatments",
    nameAr: "علاجات الوجه والبشرة",
    nameEn: "Face Treatments",
    description: "PRP for face, Plant Stem Cells, and Mesotherapy formulations",
    icon: "Heart",
  },
  "skin-boosters": {
    id: "skin-boosters",
    nameAr: "حقن النضارة",
    nameEn: "Skin Boosters",
    description: "Skin boosters (Profhilo, Jalupro, Exofecta) and collagen stimulators (Sculptra)",
    icon: "Droplet",
  },
  facial: {
    id: "facial",
    nameAr: "الفيشال",
    nameEn: "Facial Treatments",
    description: "Hydrafacial, Dermapen, Factor Five, Peeling, and session intervals",
    icon: "Flower2",
  },
  "tattoo-removal": {
    id: "tattoo-removal",
    nameAr: "إزالة التاتو",
    nameEn: "Tattoo Removal",
    description: "Clinic Q-Switch laser devices, session protocols, and Microblading policies",
    icon: "Eraser",
  },
  "pregnancy-safety": {
    id: "pregnancy-safety",
    nameAr: "الحمل والرضاعة",
    nameEn: "Pregnancy & Lactation",
    description: "Treatment-by-treatment safety matrix during pregnancy and breastfeeding",
    icon: "ShieldCheck",
  },
  slimming: {
    id: "slimming",
    nameAr: "التنحيف",
    nameEn: "Slimming & Body Contouring",
    description: "Wegovy, Lipolysis injections, Endolift, Z-Lipo, HIFU, and body devices",
    icon: "Activity",
  },
  "facial-machines": {
    id: "facial-machines",
    nameAr: "أجهزة الوجه",
    nameEn: "Facial Machines & Devices",
    description: "Vivace, Clear+Brilliant, OxyGeneo, CAMPOMATS, CO2 laser, Plasmage, Ultrasound",
    icon: "Cpu",
  },
  dental: {
    id: "dental",
    nameAr: "الأسنان",
    nameEn: "Dental Services",
    description: "Veneers (2D–Diamond), Night Guard, Snap-On Smile, and service exclusions",
    icon: "SmilePlus",
  },
  clinics: {
    id: "clinics",
    nameAr: "العيادات",
    nameEn: "Clinics",
    description: "Consolidated clinic profiles (Dermadent, One Touch, Well Touch, New Age)",
    icon: "Building2",
  },
};

export function getCategoryInfo(id: KnowledgeCategory): Omit<KnowledgeCategoryInfo, "recordCount"> {
  return CATEGORIES[id];
}

export function getAllCategories(): Omit<KnowledgeCategoryInfo, "recordCount">[] {
  return Object.values(CATEGORIES);
}
