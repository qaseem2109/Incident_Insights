const GEOJSON_TO_DB_DISTRICT: Record<string, string> = {
  "Central Karachi": "Karachi Central",
  "East Karachi": "Karachi East",
  "South Karachi": "Karachi South",
  "West Karachi": "Karachi West",
  "Malir Karachi": "Karachi Malir",
  "Korangi Karachi": "Karachi Korangi",
  "Kambar Shahdad Kot": "Kambar Shahdadkot",
  "Shaheed Benazir Abad": "Shaheed Benazirabad",
  "Umer Kot": "Umerkot",
};

export function mapGeoJsonNameToDbDistrict(geoName: string): string {
  const trimmed = geoName.trim();
  return GEOJSON_TO_DB_DISTRICT[trimmed] || trimmed;
}

export function getDistrictCountForGeoPolygon(
  geoName: string,
  countsByDbDistrict: Record<string, number>
): number {
  const dbName = mapGeoJsonNameToDbDistrict(geoName);
  let total = countsByDbDistrict[dbName] || 0;
  // Karachi Keamari has no separate polygon; roll into West Karachi for tooltip display
  if (dbName === "Karachi West") {
    total += countsByDbDistrict["Karachi Keamari"] || 0;
  }
  return total;
}
