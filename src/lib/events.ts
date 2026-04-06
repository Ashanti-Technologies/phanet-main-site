export type EventCategory =
  | "national"
  | "regional"
  | "university-chapter"
  | "diaspora";

export type Event = {
  id: string;
  slug: string;
  title: string;
  category: EventCategory;
  date: string; // ISO: "2026-05-16"
  endDate?: string; // ISO: for multi-day events
  time: string;
  location: string;
  address?: string;
  description: string;
  body: string;
  isFeatured?: boolean;
  registrationUrl?: string;
};

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  national: "National",
  regional: "Regional",
  "university-chapter": "University Chapter",
  diaspora: "Diaspora",
};

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  national: "bg-crayola text-white",
  regional: "bg-cerulean text-white",
  "university-chapter": "bg-mikado-yellow text-gray-900",
  diaspora: "bg-midnight-green text-white",
};

export const CATEGORY_GRADIENTS: Record<EventCategory, string> = {
  national: "from-crayola/80 to-crayola/40",
  regional: "from-cerulean/80 to-cerulean/40",
  "university-chapter": "from-mikado-yellow/80 to-mikado-yellow/40",
  diaspora: "from-midnight-green/80 to-midnight-green/40",
};

const events: Event[] = [
  {
    id: "1",
    slug: "phanet-annual-prayer-conference-2026",
    title: "PHANET Annual Prayer Conference 2026",
    category: "national",
    date: "2026-05-16",
    endDate: "2026-05-18",
    time: "9:00 AM",
    location: "Accra, Ghana",
    address: "International Conference Centre, Castle Rd, Accra",
    description:
      "Three days of prayer, worship, and prophetic declarations as we converge for the annual gathering of intercessors across the nation.",
    body: `The PHANET Annual Prayer Conference is our flagship national gathering, bringing together intercessors, prophets, and prayer warriors from across Ghana and beyond.

This year's theme is "Impacting Worlds, Transforming Generations" — a call to step out of private devotion and into a life of kingdom influence in every sphere of society.

Expect three days of intense prayer sessions, prophetic ministrations, apostolic teachings, and times of corporate worship that will shift atmospheres and transform lives. Whether you are a seasoned intercessor or just beginning your prayer journey, this conference is designed to equip and activate you for greater impact.

Each session will be led by anointed ministers and apostolic voices from across Africa and the diaspora.`,
    isFeatured: true,
    registrationUrl: "https://forms.google.com",
  },
  {
    id: "2",
    slug: "night-of-solemnities-consecrated-ground",
    title: "Night of Solemnities: Consecrated Ground",
    category: "national",
    date: "2026-06-27",
    time: "8:00 PM",
    location: "Lagos, Nigeria",
    address: "Faith Cathedral, Victoria Island, Lagos",
    description:
      "A sacred night of solemn assembly, corporate intercession, and consecration as we stand in the gap for the nation.",
    body: `The Night of Solemnities is a solemn assembly held across key cities, uniting the body of Christ in one voice of intercession over the nation.

This gathering is rooted in the ancient practice of solemn assemblies where God's people come together in fasting, prayer, and consecration. We will spend the night in worship, the Word, and deep intercession for Nigeria, Africa, and the nations.

Dress modestly. Come fasted if possible. Come ready to encounter the Living God.`,
    registrationUrl: "https://forms.google.com",
  },
  {
    id: "3",
    slug: "elim-hour-special-assembly",
    title: "Elim Hour Special Assembly",
    category: "national",
    date: "2026-08-08",
    time: "7:00 PM",
    location: "Kumasi, Ghana",
    address: "KNUST Great Hall, Kumasi",
    description:
      "A special gathering of the Elim Hour family for worship, the Word, and deeper community.",
    body: `Elim Hour is our flagship weekly online gathering, and this special in-person assembly brings the Elim Hour community together face to face.

The evening will feature extended worship, an apostolic word, and fellowship. This is a moment to deepen connections and celebrate what God is doing among us.

All Elim Hour regular participants are warmly invited, as well as anyone who wants to experience the Elim Hour community for the first time.`,
    registrationUrl: "https://forms.google.com",
  },
  {
    id: "4",
    slug: "phanet-closing-service-2026",
    title: "PHANET Closing Service 2026",
    category: "national",
    date: "2026-12-05",
    time: "10:00 AM",
    location: "Accra, Ghana",
    address: "Phanerosis Prayer Centre, East Legon, Accra",
    description:
      "Join us as we close out the year in thanksgiving, worship, and prophetic declarations for 2027.",
    body: `As we draw the curtains on 2026, we gather as a national family to celebrate God's faithfulness over the year.

The closing service will feature testimonies, extended worship, and a prophetic word to launch us into the new year with boldness and clarity. This is a celebration of what God has done and an alignment for what He is about to do.

Come expectant. Come grateful. Come ready for the new.`,
    registrationUrl: "https://forms.google.com",
  },
  {
    id: "5",
    slug: "west-africa-regional-prayer-summit",
    title: "West Africa Regional Prayer Summit",
    category: "regional",
    date: "2026-04-25",
    endDate: "2026-04-26",
    time: "10:00 AM",
    location: "Abidjan, Côte d'Ivoire",
    address: "Plateau Convention Centre, Abidjan",
    description:
      "A two-day regional convergence for intercessors across West Africa to pray for the region's spiritual and social transformation.",
    body: `The West Africa Regional Prayer Summit gathers leaders, intercessors, and believers from across the West African sub-region for a focused time of prayer over our shared geographical and spiritual territory.

We will intercede for peace, righteous governance, kingdom advancement in every sphere, and the raising up of the next generation of intercessors.

Simultaneous translation will be available in French and English.`,
    registrationUrl: "https://forms.google.com",
  },
  {
    id: "6",
    slug: "east-africa-chapter-meeting",
    title: "East Africa Chapter Meeting",
    category: "regional",
    date: "2026-07-11",
    time: "9:00 AM",
    location: "Nairobi, Kenya",
    address: "Nairobi Chapel, Karen, Nairobi",
    description:
      "The East Africa chapter comes together for fellowship, strategic planning, and corporate prayer for the region.",
    body: `The East Africa Chapter Meeting is a key gathering for all PHANET members and affiliates in East Africa.

The agenda includes chapter updates, testimonies from members across the region, strategic prayer sessions, and alignment with the global PHANET vision.

This is also a time to forge stronger connections between intercessors in Kenya, Uganda, Tanzania, Ethiopia, and surrounding nations.`,
    registrationUrl: "https://forms.google.com",
  },
  {
    id: "7",
    slug: "southern-africa-prayer-convocation",
    title: "Southern Africa Prayer Convocation",
    category: "regional",
    date: "2026-09-19",
    time: "10:00 AM",
    location: "Johannesburg, South Africa",
    address: "Sandton Convention Centre, Johannesburg",
    description:
      "Intercessors from Southern Africa unite for a powerful convocation of prayer, declarations, and kingdom alignment.",
    body: `The Southern Africa Prayer Convocation is a landmark gathering for the PHANET family in Southern Africa.

With representation from South Africa, Zimbabwe, Zambia, Botswana, and Mozambique, this convocation will focus on praying for political stability, economic justice, and spiritual awakening across the region.

The gathering will include plenary prayer sessions, workshops on intercessory models, and dynamic corporate worship.`,
    registrationUrl: "https://forms.google.com",
  },
  {
    id: "8",
    slug: "university-of-ghana-campus-fellowship",
    title: "University of Ghana Campus Fellowship",
    category: "university-chapter",
    date: "2026-04-18",
    time: "6:00 PM",
    location: "Legon, Accra, Ghana",
    address: "University of Ghana, Great Hall, Legon",
    description:
      "Monthly campus fellowship for students at the University of Ghana who are passionate about prayer and kingdom impact.",
    body: `The University of Ghana Campus Chapter of PHANET meets monthly to pray for campus, nation, and generation.

This month's fellowship will focus on prayer for academic breakthrough, spiritual awakening on campus, and raising up students who will impact every sphere of society.

All UG students are welcome — whether you are a first-year student or a final-year researcher. Come as you are; leave transformed.`,
    registrationUrl: "https://forms.google.com",
  },
  {
    id: "9",
    slug: "knust-prayer-week",
    title: "KNUST Prayer Week",
    category: "university-chapter",
    date: "2026-05-09",
    endDate: "2026-05-12",
    time: "6:30 PM",
    location: "Kumasi, Ghana",
    address: "KNUST, Unity Hall, Kumasi",
    description:
      "Four evenings of prayer, worship, and the Word on the KNUST campus. Open to all students and staff.",
    body: `Prayer Week is an annual highlight on the KNUST campus — four evenings of focused intercession, worship, and apostolic teaching.

Each evening will carry a different theme:
- Night 1: Prayer for Personal Breakthrough
- Night 2: Prayer for the Campus & Academy
- Night 3: Prayer for Ghana & Africa
- Night 4: Night Watch — All-Night Prayer

This is one of the most impactful events on campus each semester. Don't miss it.`,
    registrationUrl: "https://forms.google.com",
  },
  {
    id: "10",
    slug: "west-african-university-prayer-summit",
    title: "West African University Prayer Summit",
    category: "university-chapter",
    date: "2026-10-03",
    time: "10:00 AM",
    location: "Online (Zoom)",
    description:
      "University chapters across West Africa come together online for a joint prayer summit, fellowship, and vision alignment.",
    body: `The West African University Prayer Summit brings together university campus chapters from across the region for a united virtual gathering.

Chapters from Ghana, Nigeria, Côte d'Ivoire, Senegal, and Cameroon will join in a powerful time of prayer, testimonies, and vision-sharing.

Zoom link will be shared with registered participants 48 hours before the event.`,
    registrationUrl: "https://forms.google.com",
  },
  {
    id: "11",
    slug: "diaspora-prayer-summit-uk",
    title: "Diaspora Prayer Summit — UK",
    category: "diaspora",
    date: "2026-05-30",
    time: "3:00 PM",
    location: "London, United Kingdom",
    address: "Kingsway International Christian Centre, Walthamstow, London",
    description:
      "The UK diaspora chapter gathers for an afternoon of prayer, worship, and fellowship in the heart of London.",
    body: `The Diaspora Prayer Summit — UK is a gathering for all Phanerosis Prayer Network members, friends, and family in the United Kingdom.

This afternoon event will feature worship, prayer, an apostolic message, and time to connect with other intercessors in the UK diaspora.

Whether you have been with PHANET for years or are discovering us for the first time, you are warmly welcome.`,
    registrationUrl: "https://forms.google.com",
  },
  {
    id: "12",
    slug: "north-america-prayer-connect",
    title: "North America Prayer Connect",
    category: "diaspora",
    date: "2026-07-25",
    time: "4:00 PM",
    location: "Toronto, Canada",
    address: "Redemption Church, Scarborough, Toronto",
    description:
      "Intercessors across North America — USA and Canada — unite in Toronto for a powerful afternoon of prayer and connection.",
    body: `The North America Prayer Connect brings together PHANET members from across the United States and Canada for a special afternoon gathering in Toronto.

This is a time to strengthen our diaspora network, pray for the nations we are living in, and carry the mandate of intercession into the Western world.

A live stream will be available for members unable to travel to Toronto.`,
    registrationUrl: "https://forms.google.com",
  },
];

export function getAllEvents(): Event[] {
  return events;
}

export function getEventBySlug(slug: string): Event | undefined {
  return events.find((e) => e.slug === slug);
}

export function getFeaturedEvent(): Event | undefined {
  return events.find((e) => e.isFeatured);
}

export function formatEventDate(date: string, endDate?: string): string {
  const start = new Date(date);
  const opts: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
  };
  if (!endDate) return start.toLocaleDateString("en-US", opts);
  const end = new Date(endDate);
  // Same month: "May 16–18, 2026"
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString("en-US", { month: "long" })} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
  }
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

export function formatEventDateShort(date: string): { month: string; day: string } {
  const d = new Date(date);
  return {
    month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: String(d.getDate()),
  };
}
