/**
 * Type definitions for live vehicle data
 */

/**
 * Live vehicle data from the external API
 */
export interface LiveVehicleData {
  Plate: string;
  Speed: number | null;
  Latitude: number;
  Longitude: number;
  LocTime: string;
  Quality: string;
  Mileage: number;
  Pocsagstr: string;
  Head: string;
  Geozone: string;
  DriverName: string;
  NameEvent: string;
  Temperature: string;
  Address: string;
}
