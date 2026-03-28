// Distance
export function kmToMiles(km: number): number {
  return km * 0.621371;
}

export function milesToKm(miles: number): number {
  return miles / 0.621371;
}

// Volume
export function litersToGallonsUS(liters: number): number {
  return liters * 0.264172;
}

export function gallonsUSToLiters(gallons: number): number {
  return gallons / 0.264172;
}

export function litersToGallonsUK(liters: number): number {
  return liters * 0.219969;
}

// Fuel economy
export function lPer100kmToMpgUS(lPer100km: number): number {
  if (lPer100km <= 0) return 0;
  return 235.215 / lPer100km;
}

export function lPer100kmToMpgUK(lPer100km: number): number {
  if (lPer100km <= 0) return 0;
  return 282.481 / lPer100km;
}

export function lPer100kmToKmPerL(lPer100km: number): number {
  if (lPer100km <= 0) return 0;
  return 100 / lPer100km;
}

export function mpgUSToLPer100km(mpg: number): number {
  if (mpg <= 0) return 0;
  return 235.215 / mpg;
}

// Format with unit
export function formatDistance(km: number, unitSystem: string): string {
  if (unitSystem === 'imperial') {
    return `${Math.round(kmToMiles(km)).toLocaleString()} mi`;
  }
  return `${Math.round(km).toLocaleString()} km`;
}

export function formatVolume(liters: number, unitSystem: string): string {
  if (unitSystem === 'imperial') {
    return `${litersToGallonsUS(liters).toFixed(1)} gal`;
  }
  return `${liters.toFixed(1)} L`;
}

export function formatFuelEconomy(lPer100km: number, fuelEconomyUnit: string): string {
  switch (fuelEconomyUnit) {
    case 'mpg_us': return `${lPer100kmToMpgUS(lPer100km).toFixed(1)} MPG`;
    case 'mpg_uk': return `${lPer100kmToMpgUK(lPer100km).toFixed(1)} MPG (UK)`;
    case 'km_per_l': return `${lPer100kmToKmPerL(lPer100km).toFixed(1)} km/L`;
    default: return `${lPer100km.toFixed(1)} L/100km`;
  }
}

export function getDistanceUnit(unitSystem: string): string {
  return unitSystem === 'imperial' ? 'mi' : 'km';
}

export function getVolumeUnit(unitSystem: string): string {
  return unitSystem === 'imperial' ? 'gal' : 'L';
}

export function getFuelEconomyUnitLabel(fuelEconomyUnit: string): string {
  switch (fuelEconomyUnit) {
    case 'mpg_us': return 'MPG (US)';
    case 'mpg_uk': return 'MPG (UK)';
    case 'km_per_l': return 'km/L';
    default: return 'L/100km';
  }
}

// Electric vehicle unit helpers
export function getVolumeUnitElectric(unitSystem: string, isElectric: boolean): string {
  if (isElectric) return 'kWh';
  return getVolumeUnit(unitSystem);
}

export function getFuelEconomyUnitLabelElectric(fuelEconomyUnit: string, isElectric: boolean): string {
  if (isElectric) return 'kWh/100km';
  return getFuelEconomyUnitLabel(fuelEconomyUnit);
}

export function formatVolumeElectric(liters: number, unitSystem: string, isElectric: boolean): string {
  if (isElectric) return `${liters.toFixed(1)} kWh`;
  return formatVolume(liters, unitSystem);
}

export function formatFuelEconomyElectric(lPer100km: number, fuelEconomyUnit: string, isElectric: boolean): string {
  if (isElectric) return `${lPer100km.toFixed(1)} kWh/100km`;
  return formatFuelEconomy(lPer100km, fuelEconomyUnit);
}

// Convert display value back to storage value (always metric)
export function displayDistanceToKm(value: number, unitSystem: string): number {
  return unitSystem === 'imperial' ? milesToKm(value) : value;
}

export function displayVolumeToLiters(value: number, unitSystem: string): number {
  return unitSystem === 'imperial' ? gallonsUSToLiters(value) : value;
}
