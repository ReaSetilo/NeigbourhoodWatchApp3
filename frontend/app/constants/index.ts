import type { AxisModel } from "@syncfusion/ej2-react-charts";
import { formatDate } from "~/lib/utils";

export const sidebarItems = [
  {
    id: 1,
    icon: "/assets/icons/home.svg",
    label: "Dashboard",
    href: "/dashboard",
  },
  {
    id: 2,
    icon: "/assets/icons/securityOfficer.svg",
    label: "Security Officers",
    href: "/officers",
  },
  {
    id: 3,
    icon: "/assets/icons/users.svg",
    label: "Members",
    href: "/members",
  },
  {
    id: 4,
    icon: "/assets/icons/adminLogo_no_bg.png",
    label: "Admins",
    href: "/admins",
  },
  {
    id: 5,
    icon: "/assets/icons/HousesIcon.png",
    label: "houses",
    href: "/houses",
  },
];

export const chartOneData: object[] = [
  {
    x: "Jan",
    y1: 0.5,
    y2: 1.5,
    y3: 0.7,
  },
  {
    x: "Feb",
    y1: 0.8,
    y2: 1.2,
    y3: 0.9,
  },
  {
    x: "Mar",
    y1: 1.2,
    y2: 1.8,
    y3: 1.5,
  },
  {
    x: "Apr",
    y1: 1.5,
    y2: 2.0,
    y3: 1.8,
  },
  {
    x: "May",
    y1: 1.8,
    y2: 2.5,
    y3: 2.0,
  },
  {
    x: "Jun",
    y1: 2.0,
    y2: 2.8,
    y3: 2.5,
  },
];

export const travelStyles = [
  "Relaxed",
  "Luxury",
  "Adventure",
  "Cultural",
  "Nature & Outdoors",
  "City Exploration",
];

export const interests = [
  "Food & Culinary",
  "Historical Sites",
  "Hiking & Nature Walks",
  "Beaches & Water Activities",
  "Museums & Art",
  "Nightlife & Bars",
  "Photography Spots",
  "Shopping",
  "Local Experiences",
];

export const budgetOptions = ["Budget", "Mid-range", "Luxury", "Premium"];

export const groupTypes = ["Solo", "Couple", "Family", "Friends", "Business"];

export const footers = ["Terms & Condition", "Privacy Policy"];

export const selectItems = [
  "groupType",
  "travelStyle",
  "interest",
  "budget",
] as (keyof TripFormData)[];

export const comboBoxItems = {
  groupType: groupTypes,
  travelStyle: travelStyles,
  interest: interests,
  budget: budgetOptions,
} as Record<keyof TripFormData, string[]>;

export const userXAxis: AxisModel = { valueType: "Category", title: "Day" };
export const useryAxis: AxisModel = {
  minimum: 0,
  maximum: 10,
  interval: 2,
  title: "Count",
};

export const tripXAxis: AxisModel = {
  valueType: "Category",
  title: "Travel Styles",
  majorGridLines: { width: 0 },
};

export const tripyAxis: AxisModel = {
  minimum: 0,
  maximum: 10,
  interval: 2,
  title: "Count",
};

export const CONFETTI_SETTINGS = {
  particleCount: 200, // Number of confetti pieces
  spread: 60, // Spread of the confetti burst
  colors: ["#ff0", "#ff7f00", "#ff0044", "#4c94f4", "#f4f4f4"], // Confetti colors
  decay: 0.95, // Gravity decay of the confetti
};

export const LEFT_CONFETTI = {
  ...CONFETTI_SETTINGS,
  angle: 45, // Direction of the confetti burst (90 degrees is top)
  origin: { x: 0, y: 1 }, // Center of the screen
};

export const RIGHT_CONFETTI = {
  ...CONFETTI_SETTINGS,
  angle: 135,
  origin: { x: 1, y: 1 },
};
export const users = [
  {
    id: 1,
    name: "Reatile Setilo",
    email: "ReaSet@gmail.com",
    dateJoined: formatDate("2025-01-03"),
    userType: "admin",
  },
  {
    id: 2,
    name: "Thabo Mosweu",
    email: "thabo.mosweu@gmail.com",
    dateJoined: formatDate("2025-01-15"),
    userType: "user",
  },
  {
    id: 3,
    name: "Lerato Kgosi",
    email: "lerato.kgosi@outlook.com",
    dateJoined: formatDate("2025-02-08"),
    userType: "moderator",
  },
  {
    id: 4,
    name: "Kagiso Molefe",
    email: "k.molefe@yahoo.com",
    dateJoined: formatDate("2024-12-20"),
    userType: "user",
  },
  {
    id: 5,
    name: "Boitumelo Serame",
    email: "boitumelo.s@gmail.com",
    dateJoined: formatDate("2025-03-12"),
    userType: "user",
  },
  {
    id: 6,
    name: "Neo Maphosa",
    email: "neo.maphosa@mail.com",
    dateJoined: formatDate("2024-11-05"),
    userType: "admin",
  },
  {
    id: 7,
    name: "Kitso Ramatapa",
    email: "kitso.r@gmail.com",
    dateJoined: formatDate("2025-02-28"),
    userType: "user",
  },
  {
    id: 8,
    name: "Tshepo Gaborone",
    email: "tshepo.gabs@hotmail.com",
    dateJoined: formatDate("2025-01-22"),
    userType: "moderator",
  },
  {
    id: 9,
    name: "Kelebogile Modise",
    email: "kele.modise@gmail.com",
    dateJoined: formatDate("2024-10-18"),
    userType: "user",
  },
  {
    id: 10,
    name: "Mpho Dintwe",
    email: "mpho.dintwe@mail.com",
    dateJoined: formatDate("2025-04-02"),
    userType: "user",
  },
];