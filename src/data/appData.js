import { payoutHistory } from '../mockData'

export const cityOptions = [
  'Delhi',
  'Mumbai',
  'Bengaluru',
  'Chennai',
  'Hyderabad',
]

export const platformOptions = [
  { label: 'Zomato', value: 'Zomato' },
  { label: 'Swiggy', value: 'Swiggy' },
  { label: 'Both', value: 'Both' },
]

export const vehicleOptions = [
  { label: 'Two-Wheeler ICE', value: 'Two-Wheeler ICE' },
  { label: 'Two-Wheeler EV', value: 'Two-Wheeler EV' },
  { label: 'Bicycle', value: 'Bicycle' },
]

export const planOptions = [
  {
    name: 'Basic',
    weeklyPremium: 49,
    payoutPerDay: 300,
    weeklyCap: 900,
    features: [
      'AQI trigger coverage',
      'Rainfall trigger coverage',
      'Instant UPI payout',
    ],
  },
  {
    name: 'Standard',
    weeklyPremium: 61,
    payoutPerDay: 400,
    weeklyCap: 1200,
    recommended: true,
    features: [
      'Everything in Basic',
      'Heatwave trigger coverage',
      'Priority payout processing',
    ],
  },
  {
    name: 'Premium',
    weeklyPremium: 74,
    payoutPerDay: 500,
    weeklyCap: 1500,
    features: [
      'Everything in Standard',
      'Zone-specific multiplier',
      'Dedicated support',
    ],
  },
]

export const riskSnapshot = [
  {
    label: 'AQI Risk (Delhi, Oct-Jan)',
    descriptor: 'High Season',
    value: 78,
  },
  {
    label: 'Flood Risk (Delhi)',
    descriptor: 'Moderate',
    value: 35,
  },
  {
    label: 'Heat Risk (Delhi, Apr-Jun)',
    descriptor: 'Elevated',
    value: 62,
  },
]

export const recentActivity = [
  {
    id: 'activity-1',
    title: 'AQI Trigger Fired - Delhi',
    date: 'Nov 14, 2025',
    amount: 1200,
    badge: { label: 'Paid', status: 'paid' },
  },
  {
    id: 'activity-2',
    title: 'Premium Deducted',
    date: 'Nov 11, 2025',
    amount: -61,
    badge: { label: 'Auto', status: 'neutral' },
  },
  {
    id: 'activity-3',
    title: 'Monsoon Trigger Fired - Delhi',
    date: 'Sep 3, 2025',
    amount: 800,
    badge: { label: 'Paid', status: 'paid' },
  },
]

export const payoutFilters = ['All', 'AQI', 'Rainfall', 'Heatwave']

export const payoutTimeline = [
  {
    title: 'AQI threshold breached',
    date: 'Nov 14, 2025, 6:42 AM',
    description: 'Delhi AQI reached 318, Station: IGI Airport',
  },
  {
    title: 'Composite trigger confirmed',
    date: 'Nov 14, 2025, 6:43 AM',
    description: 'Order volume drop of 38% confirmed in your zone',
  },
  {
    title: 'Payout initiated',
    date: 'Nov 14, 2025, 6:44 AM',
    description: 'Rs 400 x 3 disruption days = Rs 1,200',
  },
  {
    title: 'Credited to UPI',
    date: 'Nov 14, 2025, 6:47 AM',
    description: 'arjun.kumar@upi - 3 minutes 14 seconds',
  },
]

export const adminRecentPayouts = [
  {
    date: 'Nov 14, 2025',
    city: 'Delhi',
    trigger: 'AQI Spike',
    amount: 'Rs 4.8L',
    partners: '400 partners',
  },
  {
    date: 'Sep 3, 2025',
    city: 'Mumbai',
    trigger: 'Rainfall',
    amount: 'Rs 2.1L',
    partners: '175 partners',
  },
  {
    date: 'May 18, 2025',
    city: 'Delhi',
    trigger: 'Heatwave',
    amount: 'Rs 3.6L',
    partners: '300 partners',
  },
]

export const adminTriggerConfig = {
  AQI: {
    fieldLabel: 'AQI Reading (threshold: 300)',
    threshold: 300,
    defaultReading: 318,
    unit: '',
    title: 'AQI Spike',
  },
  Rainfall: {
    fieldLabel: '24h Rainfall in mm (threshold: 100)',
    threshold: 100,
    defaultReading: 118,
    unit: 'mm',
    title: 'Rainfall',
  },
  Heatwave: {
    fieldLabel: 'Max Temperature in C (threshold: 43)',
    threshold: 43,
    defaultReading: 44,
    unit: 'C',
    title: 'Heatwave',
  },
}

export const defaultTriggerAlert = {
  type: 'AQI',
  city: 'Delhi',
  reading: 318,
  threshold: 300,
  daysTriggered: 2,
  requiredDays: 2,
  source: 'CPCB Delhi Station',
}

export const payoutSummary = {
  totalReceived: 4400,
  totalPayouts: 6,
  totalTriggers: 3,
}

export const payoutEntries = payoutHistory.map((item) => ({
  ...item,
  label:
    item.type === 'AQI'
      ? 'AQI Trigger'
      : item.type === 'Rainfall'
        ? 'Rainfall Trigger'
        : 'Heatwave Trigger',
}))
