import { useCallback, useMemo } from 'react';
import { useUserConfig } from '../contexts/UserConfigContext';
import * as units from '../utils/units';

export function useUnits(vehicleOverride?: { useHours?: boolean; isElectric?: boolean }) {
  const { config } = useUserConfig();
  const { unitSystem, fuelEconomyUnit } = config;
  const useHours = vehicleOverride?.useHours ?? false;
  const isElectric = vehicleOverride?.isElectric ?? false;

  const fmtDistance = useCallback(
    (km: number) => {
      if (useHours) return `${Math.round(km).toLocaleString()} h`;
      return units.formatDistance(km, unitSystem);
    },
    [unitSystem, useHours]
  );

  const fmtVolume = useCallback(
    (liters: number) => units.formatVolumeElectric(liters, unitSystem, isElectric),
    [unitSystem, isElectric]
  );

  const fmtFuelEconomy = useCallback(
    (lPer100km: number) => {
      if (useHours) {
        // lPer100km is stored as L/100km; for hours mode show L/h
        // When useHours, consumption is already stored as L/h (since "distance" is hours)
        // lPer100km actually represents fuel per 100 "hours", so L/h = lPer100km / 100
        const lPerH = lPer100km / 100;
        const volUnit = unitSystem === 'imperial' ? 'gal' : 'L';
        const value = unitSystem === 'imperial' ? units.litersToGallonsUS(lPerH) : lPerH;
        return `${value.toFixed(2)} ${volUnit}/h`;
      }
      return units.formatFuelEconomyElectric(lPer100km, fuelEconomyUnit, isElectric);
    },
    [fuelEconomyUnit, useHours, unitSystem, isElectric]
  );

  const distanceUnit = useMemo(() => {
    if (useHours) return 'h';
    return units.getDistanceUnit(unitSystem);
  }, [unitSystem, useHours]);

  const volumeUnit = units.getVolumeUnitElectric(unitSystem, isElectric);

  const fuelEconomyUnitLabel = useMemo(() => {
    if (useHours) {
      const volUnit = unitSystem === 'imperial' ? 'gal' : 'L';
      return `${volUnit}/h`;
    }
    return units.getFuelEconomyUnitLabelElectric(fuelEconomyUnit, isElectric);
  }, [fuelEconomyUnit, useHours, unitSystem, isElectric]);

  const toDisplayDistance = useCallback(
    (km: number) => {
      if (useHours) return km; // hours stored as-is
      return unitSystem === 'imperial' ? units.kmToMiles(km) : km;
    },
    [unitSystem, useHours]
  );

  const toDisplayVolume = useCallback(
    (liters: number) => (unitSystem === 'imperial' && !isElectric) ? units.litersToGallonsUS(liters) : liters,
    [unitSystem, isElectric]
  );

  const toStorageDistance = useCallback(
    (display: number) => {
      if (useHours) return display; // hours stored as-is
      return units.displayDistanceToKm(display, unitSystem);
    },
    [unitSystem, useHours]
  );

  const toStorageVolume = useCallback(
    (display: number) => (unitSystem === 'imperial' && !isElectric) ? units.displayVolumeToLiters(display, unitSystem) : display,
    [unitSystem, isElectric]
  );

  return {
    unitSystem, fuelEconomyUnit,
    fmtDistance, fmtVolume, fmtFuelEconomy,
    distanceUnit, volumeUnit, fuelEconomyUnitLabel,
    toDisplayDistance, toDisplayVolume,
    toStorageDistance, toStorageVolume,
  };
}
