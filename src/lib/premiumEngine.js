const CITY_RISK = {
  Delhi: { aqi: 0.3, flood: 0.1, heat: 0.25 },
  Mumbai: { aqi: 0.05, flood: 0.35, heat: 0.1 },
  Bengaluru: { aqi: 0.05, flood: 0.3, heat: 0.05 },
  Chennai: { aqi: 0.05, flood: 0.2, heat: 0.25 },
  Hyderabad: { aqi: 0.15, flood: 0.1, heat: 0.25 },
}

const ZONE_RISK_OVERRIDES = {
  'Sarjapur Road': 0.15,
  Bellandur: 0.15,
  Whitefield: 0.12,
  Chembur: 0.14,
  Andheri: 0.12,
  Parel: 0.12,
  NH8: 0.14,
  'Connaught Place': 0.05,
}

const VEHICLE_MODIFIER = {
  'Two-Wheeler ICE': 0,
  'Two-Wheeler EV': -0.03,
  Bicycle: -0.05,
}

export function calculateZoneRiskScore({
  city,
  operatingZone,
  vehicleType,
  avgDailyOrders,
  avgDailyHours,
}) {
  void avgDailyHours

  const cityRisk = CITY_RISK[city] ?? CITY_RISK.Delhi
  const baseRisk = cityRisk.aqi * 0.4 + cityRisk.flood * 0.35 + cityRisk.heat * 0.25

  const zoneKey = Object.keys(ZONE_RISK_OVERRIDES).find((zone) =>
    operatingZone.toLowerCase().includes(zone.toLowerCase()),
  )
  const zoneBonus = zoneKey ? ZONE_RISK_OVERRIDES[zoneKey] : 0

  const vehicleMod = VEHICLE_MODIFIER[vehicleType] ?? 0
  const activityMod = avgDailyOrders > 30 ? 0.05 : avgDailyOrders < 15 ? -0.05 : 0

  const rawScore = 0.85 + baseRisk * 1.5 + zoneBonus + vehicleMod + activityMod
  return Math.min(1.5, Math.max(0.85, parseFloat(rawScore.toFixed(2))))
}

export function calculateWeeklyPremium(zoneRiskScore, tierMultiplier = 1.0) {
  return Math.round(49 * zoneRiskScore * tierMultiplier)
}

export function generatePolicyNumber(city) {
  const cityCode = city.substring(0, 2).toUpperCase()
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 900000) + 100000

  return `GRIP-${cityCode}-${year}-${random}`
}

export async function fetchPremiumQuote(formData) {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/ml/premium-quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: formData.city,
        zone: formData.operatingZone,
        vehicle_type: formData.vehicleType,
        platform: formData.platform,
        season: getCurrentSeason(),
        month: new Date().getMonth() + 1,
        avg_daily_orders: Number(formData.avgDailyOrders),
        avg_daily_hours: Number(formData.avgDailyHours),
      }),
    })

    if (!response.ok) {
      throw new Error('API unavailable')
    }

    return await response.json()
  } catch {
    const zoneRiskScore = calculateZoneRiskScore(formData)

    return {
      zone_risk_score: zoneRiskScore,
      weekly_premium_basic: calculateWeeklyPremium(zoneRiskScore, 1.0),
      weekly_premium_standard: calculateWeeklyPremium(zoneRiskScore, 1.25),
      weekly_premium_premium: calculateWeeklyPremium(zoneRiskScore, 1.5),
    }
  }
}

function getCurrentSeason() {
  const month = new Date().getMonth() + 1

  if ([3, 4, 5].includes(month)) return 'Pre-monsoon'
  if ([6, 7, 8, 9].includes(month)) return 'Monsoon'
  if ([10, 11].includes(month)) return 'Post-monsoon'
  return 'Winter'
}
