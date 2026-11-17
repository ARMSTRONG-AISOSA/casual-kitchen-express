// The demo staff (the same people as the Business app's demo data), shared by seed-people.ts and
// reset-demo.ts. Staff a manager adds later aren't here, so Reset demo data removes them (MGR-29).
export type Gender = "female" | "male";
export type R = "rider" | "kitchen" | "dispatch" | "accounts" | "manager";
export const PEOPLE: [string, string, R, string, string, Gender, string?][] = [
  ["M-001", "Efosa Igbinedion", "manager", "Owner", "0803 555 0100", "male"],
  ["M-002", "Ivie Osagie", "manager", "Operations manager", "0803 555 0101", "female"],
  ["K-001", "Blessing Okafor", "kitchen", "Head cook", "0806 555 0120", "female", "blessing.k"],
  ["K-002", "Samuel Eze", "kitchen", "Counter", "0806 555 0121", "male", "samuel.k"],
  ["D-001", "Osas Edo", "dispatch", "Dispatch officer", "0807 555 0130", "male", "osas.d"],
  ["A-001", "Ngozi Bello", "accounts", "Account officer", "0809 555 0140", "female", "ngozi.a"],
  ["R-001", "Musa Abdullahi", "rider", "Delivery rider", "0802 555 0177", "male", "musa.a"],
  ["R-002", "Chidi Nwosu", "rider", "Delivery rider", "0802 555 0178", "male", "chidi.r"],
  ["R-003", "Femi Ade", "rider", "Delivery rider", "0802 555 0179", "male", "femi.r"],
  ["R-004", "Uyi Ogbe", "rider", "Delivery rider", "0802 555 0180", "male", "uyi.r"],
];
