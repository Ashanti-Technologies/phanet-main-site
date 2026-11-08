// Shared by the profile view (server) and edit form (client).
export type Gender = "MALE" | "FEMALE";
export type MaritalStatus = "SINGLE" | "MARRIED" | "WIDOWED" | "DIVORCED";
export type LifeStage = "WORKING_PROFESSIONAL" | "TERTIARY_STUDENT" | "SHS_STUDENT";
export type RegionalChapter =
  | "GREATER_ACCRA"
  | "ASHANTI"
  | "DIASPORA"
  | "NORTHERN"
  | "CENTRAL_NORTH"
  | "CENTRAL_SOUTH"
  | "NORTH_EAST"
  | "BONO"
  | "EASTERN"
  | "WESTERN";
export type ProfessionalTrack = "EMPLOYED" | "SELF_EMPLOYED" | "STUDYING_OVERSEAS";

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: "Male",
  FEMALE: "Female",
};
export const MARITAL_LABELS: Record<MaritalStatus, string> = {
  SINGLE: "Single",
  MARRIED: "Married",
  WIDOWED: "Widowed",
  DIVORCED: "Divorced",
};
export const LIFE_STAGE_LABELS: Record<LifeStage, string> = {
  WORKING_PROFESSIONAL: "Working professional",
  TERTIARY_STUDENT: "Tertiary student",
  SHS_STUDENT: "SHS student",
};
export const REGIONAL_CHAPTER_LABELS: Record<RegionalChapter, string> = {
  GREATER_ACCRA: "Greater Accra",
  ASHANTI: "Ashanti",
  DIASPORA: "Diaspora",
  NORTHERN: "Northern",
  CENTRAL_NORTH: "Central North",
  CENTRAL_SOUTH: "Central South",
  NORTH_EAST: "North East",
  BONO: "Bono",
  EASTERN: "Eastern",
  WESTERN: "Western",
};
export const TRACK_LABELS: Record<ProfessionalTrack, string> = {
  EMPLOYED: "Employed",
  SELF_EMPLOYED: "Self-employed",
  STUDYING_OVERSEAS: "Studying overseas",
};
