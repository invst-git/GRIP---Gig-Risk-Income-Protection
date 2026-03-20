export const partnerProfile = {
  name: "Arjun Kumar",
  city: "Delhi",
  platform: "Zomato",
  vehicleType: "Two-Wheeler ICE",
  zone: "Connaught Place",
  avgDailyOrders: 28,
  avgDailyHours: 10,
  upiId: "arjun.kumar@upi",
  enrolledSince: "October 6, 2025",
  policyNumber: "GRIP-DL-2025-004821",
  coverageTier: "Standard",
  weeklyPremium: 61,
  payoutPerDay: 400,
  weeklyCap: 1200,
  zoneRiskScore: 1.24,
};

export const payoutHistory = [
  { id: 1, type: "AQI", dateRange: "Nov 14-16, 2025", days: 3, amount: 1200, status: "Paid" },
  { id: 2, type: "Rainfall", dateRange: "Sep 3, 2025", days: 2, amount: 800, status: "Paid" },
  { id: 3, type: "AQI", dateRange: "Nov 22-24, 2024", days: 3, amount: 1200, status: "Paid" },
  { id: 4, type: "Heatwave", dateRange: "May 18-19, 2024", days: 2, amount: 800, status: "Paid" },
  { id: 5, type: "AQI", dateRange: "Dec 5-6, 2024", days: 1, amount: 400, status: "Paid" },
  { id: 6, type: "Rainfall", dateRange: "Aug 10, 2024", days: 0, amount: 0, status: "Not Triggered" },
];

export const activeTrigger = {
  type: "Curfew",
  city: "Delhi",
  zone: "Connaught Place",
  reading: "Official zone suspension issued",
  orderVolumeDrop: "71%",
  payoutAmount: 600,
  daysTriggered: 1,
  status: "Active",
};

export const adminMetrics = {
  activePolicies: 1284,
  triggersThisMonth: 7,
  totalPayoutsNov: "Rs 15.4L",
  lossRatio: "54.2%",
};

export const liveTriggers = [
  { type: "AQI", city: "Delhi", current: 318, threshold: 300, status: "Active" },
  { type: "Rainfall", city: "Mumbai", current: 12, threshold: 100, status: "Clear" },
  { type: "Heat", city: "Delhi", current: 31, threshold: 43, status: "Clear" },
];

export const cityRiskMap = [
  { city: "Delhi", aqi: "High", flood: "Moderate", heat: "High" },
  { city: "Mumbai", aqi: "Low", flood: "High", heat: "Moderate" },
  { city: "Bengaluru", aqi: "Low", flood: "High", heat: "Low" },
  { city: "Chennai", aqi: "Low", flood: "Moderate", heat: "High" },
  { city: "Hyderabad", aqi: "Moderate", flood: "Low", heat: "High" },
];

export const affectedPartnersByCity = {
  Delhi: 847,
  Mumbai: 623,
  Bengaluru: 412,
  Chennai: 289,
  Hyderabad: 318,
};
