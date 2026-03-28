import type { Vehicle, UserConfig } from '../types';

/**
 * Returns the appropriate display label for a vehicle based on the user's
 * configured vehicle identifier preference.
 */
export function getVehicleLabel(vehicle: Vehicle, config: Partial<UserConfig>): string {
  const identifier = config.vehicleIdentifier || 'name';

  if (identifier === 'name') {
    return vehicle.name || `${vehicle.brand} ${vehicle.model}`.trim() || 'Unnamed';
  }

  if (identifier === 'license_plate') {
    return vehicle.licensePlate || vehicle.name || 'Unnamed';
  }

  // custom_field:{fieldName} - try to find matching field on vehicle
  if (identifier.startsWith('custom_field:')) {
    const fieldName = identifier.substring('custom_field:'.length);
    // Check common fields
    const fieldMap: Record<string, string | undefined> = {
      brand: vehicle.brand,
      model: vehicle.model,
      variant: vehicle.variant,
      color: vehicle.color,
      hsn: vehicle.hsn,
      tsn: vehicle.tsn,
    };
    const value = fieldMap[fieldName];
    if (value) return value;
    // Fallback to name
    return vehicle.name || 'Unnamed';
  }

  return vehicle.name || 'Unnamed';
}
