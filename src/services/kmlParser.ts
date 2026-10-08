import JSZip from 'jszip';
import { Station, CongestionLevel, CargasFacilityType } from '../types';

export function parseKML(kmlText: string, imageMap?: Map<string, string>): Station[] {
  const stations: Station[] = [];
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlText, 'text/xml');

    // Build style map for custom icons
    const stylesMap = new Map<string, string>();
    const styleElems = xmlDoc.getElementsByTagName('Style');
    for (let s = 0; s < styleElems.length; s++) {
      const styleEl = styleElems[s];
      const styleId = styleEl.getAttribute('id');
      if (styleId) {
        const hrefEl = styleEl.getElementsByTagName('href')[0];
        if (hrefEl && hrefEl.textContent) {
          const href = hrefEl.textContent.trim();
          stylesMap.set(`#${styleId}`, href);
          stylesMap.set(styleId, href);
        }
      }
    }

    const placemarks = xmlDoc.getElementsByTagName('Placemark');

    for (let i = 0; i < placemarks.length; i++) {
      const pm = placemarks[i];
      const nameElem = pm.getElementsByTagName('name')[0];
      const name = nameElem ? nameElem.textContent?.trim() || `محطة كارجاس #${i + 1}` : `محطة كارجاس #${i + 1}`;

      const descElem = pm.getElementsByTagName('description')[0];
      const description = descElem ? descElem.textContent?.trim() || '' : '';

      const coordElem = pm.getElementsByTagName('coordinates')[0];
      if (!coordElem || !coordElem.textContent) continue;

      const rawCoord = coordElem.textContent.trim().split(/\s+/)[0];
      const parts = rawCoord.split(',');
      if (parts.length < 2) continue;

      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);

      if (isNaN(lat) || isNaN(lng)) continue;

      const textToSearch = (name + ' ' + description).toLowerCase();

      // Detect company
      let company = 'كارجاس';
      if (textToSearch.includes('عربية غاز') || textToSearch.includes('arabia gas')) company = 'عربية غاز';
      else if (textToSearch.includes('غازتك') || textToSearch.includes('gastec')) company = 'غازتك';
      else if (textToSearch.includes('ماستر جاس') || textToSearch.includes('master gas')) company = 'ماستر جاس';
      else if (textToSearch.includes('وطنية') || textToSearch.includes('wataniya')) company = 'وطنية';
      else if (textToSearch.includes('طاقة') || textToSearch.includes('taqa')) company = 'طاقة';

      // Detect facility type
      let facilityType: CargasFacilityType = 'station';
      const isConversion = textToSearch.includes('تحويل') || textToSearch.includes('صيانة');
      const isOil = textToSearch.includes('زيوت') || textToSearch.includes('زيت') || textToSearch.includes('bp') || textToSearch.includes('كاسترول');
      const isTesting = textToSearch.includes('فحص') || textToSearch.includes('أسطوان') || textToSearch.includes('اسطوان');

      if (isConversion) facilityType = 'conversion_center';
      else if (isOil) facilityType = 'oil_center';
      else if (isTesting) facilityType = 'cylinder_testing';

      const hasPetrol = textToSearch.includes('بنزين') || textToSearch.includes('petrol') || textToSearch.includes('92') || textToSearch.includes('95');

      // Check for custom icon or logo from KMZ styles / Placemark
      let customLogoUrl: string | undefined = undefined;
      const styleUrlEl = pm.getElementsByTagName('styleUrl')[0];
      if (styleUrlEl && styleUrlEl.textContent) {
        const styleRef = styleUrlEl.textContent.trim();
        const iconPath = stylesMap.get(styleRef);
        if (iconPath) {
          if (imageMap && imageMap.has(iconPath)) {
            customLogoUrl = imageMap.get(iconPath);
          } else if (imageMap) {
            const fname = iconPath.split('/').pop() || iconPath;
            if (imageMap.has(fname)) customLogoUrl = imageMap.get(fname);
          } else if (iconPath.startsWith('http') || iconPath.startsWith('data:')) {
            customLogoUrl = iconPath;
          }
        }
      }

      // Direct Icon tag in Placemark
      if (!customLogoUrl) {
        const iconHref = pm.getElementsByTagName('href')[0];
        if (iconHref && iconHref.textContent) {
          const href = iconHref.textContent.trim();
          if (imageMap && imageMap.has(href)) {
            customLogoUrl = imageMap.get(href);
          } else if (href.startsWith('http') || href.startsWith('data:')) {
            customLogoUrl = href;
          }
        }
      }

      stations.push({
        id: `imported-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        name,
        company,
        facilityType,
        address: description || 'تم الاستيراد من خريطة Google Earth / KMZ المعتمدة',
        lat,
        lng,
        customLogoUrl,
        cng: true,
        petrol: hasPetrol,
        conversionCenter: isConversion,
        oilCenter: isOil,
        cylinderInspection: true,
        cngNozzles: 8,
        pressureBar: 220,
        congestionLevel: 'low',
        waitTimeMinutes: 4,
        verified: true,
        workingHours: '24 ساعة',
        services: [
          'تموين غاز طبيعي مضغوط',
          isConversion ? 'مركز تحويل وصيانة غاز' : '',
          isOil ? 'مركز زيوت معتمد' : '',
          'فحص واختبار أسطوانات'
        ].filter(Boolean),
        notes: `مستوردة من Google Earth: ${description}`.substring(0, 200),
        updatedAt: new Date().toISOString().substring(0, 16)
      });
    }
  } catch (err) {
    console.error('Error parsing KML:', err);
  }
  return stations;
}

// KMZ Parser (Zip archive of KML + Custom Images / Logos)
export async function parseKMZ(arrayBuffer: ArrayBuffer): Promise<Station[]> {
  const zip = await JSZip.loadAsync(arrayBuffer);

  // 1. Find the .kml file
  let kmlFileName = '';
  for (const name of Object.keys(zip.files)) {
    if (name.toLowerCase().endsWith('.kml')) {
      kmlFileName = name;
      break;
    }
  }

  if (!kmlFileName) {
    throw new Error('لم يتم العثور على ملف KML داخل ملف KMZ');
  }

  const kmlFile = zip.files[kmlFileName];
  const kmlText = await kmlFile.async('text');

  // 2. Extract all images and logos inside KMZ as Data URLs
  const imageMap = new Map<string, string>();
  for (const [path, file] of Object.entries(zip.files)) {
    const lower = path.toLowerCase();
    if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.svg') || lower.endsWith('.webp') || lower.endsWith('.gif')) {
      const mime = lower.endsWith('.svg') ? 'image/svg+xml' : lower.endsWith('.png') ? 'image/png' : 'image/jpeg';
      const base64 = await file.async('base64');
      const dataUrl = `data:${mime};base64,${base64}`;
      imageMap.set(path, dataUrl);
      const filename = path.split('/').pop() || path;
      imageMap.set(filename, dataUrl);
    }
  }

  // 3. Parse KML with extracted images
  return parseKML(kmlText, imageMap);
}

export function parseCSV(csvText: string): Station[] {
  const stations: Station[] = [];
  try {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    // Header check
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('اسم') || h.includes('محطة'));
    const companyIdx = headers.findIndex(h => h.includes('company') || h.includes('شركة'));
    const latIdx = headers.findIndex(h => h.includes('lat') || h.includes('خط عرض') || h.includes('y'));
    const lngIdx = headers.findIndex(h => h.includes('lng') || h.includes('lon') || h.includes('خط طول') || h.includes('x'));
    const addrIdx = headers.findIndex(h => h.includes('addr') || h.includes('عنوان') || h.includes('desc'));
    const typeIdx = headers.findIndex(h => h.includes('type') || h.includes('نوع') || h.includes('خدمة'));
    const logoIdx = headers.findIndex(h => h.includes('logo') || h.includes('لوجو') || h.includes('صورة') || h.includes('icon'));

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 2) continue;

      const lat = parseFloat(cols[latIdx !== -1 ? latIdx : 1]);
      const lng = parseFloat(cols[lngIdx !== -1 ? lngIdx : 2]);
      if (isNaN(lat) || isNaN(lng)) continue;

      const name = cols[nameIdx !== -1 ? nameIdx : 0] || `محطة #${i}`;
      const company = (cols[companyIdx !== -1 ? companyIdx : 3] || 'كارجاس').trim();
      const addr = cols[addrIdx !== -1 ? addrIdx : 4] || 'عنوان المحطة';
      const rawType = (cols[typeIdx !== -1 ? typeIdx : 5] || '').toLowerCase();
      const customLogoUrl = logoIdx !== -1 ? cols[logoIdx] : undefined;

      let facilityType: CargasFacilityType = 'station';
      const isConversion = rawType.includes('تحويل') || name.includes('تحويل');
      const isOil = rawType.includes('زيوت') || rawType.includes('زيت') || name.includes('زيوت');
      const isTesting = rawType.includes('فحص') || name.includes('فحص');

      if (isConversion) facilityType = 'conversion_center';
      else if (isOil) facilityType = 'oil_center';
      else if (isTesting) facilityType = 'cylinder_testing';

      stations.push({
        id: `csv-${Date.now()}-${i}`,
        name,
        company: company || 'كارجاس',
        facilityType,
        address: addr,
        lat,
        lng,
        customLogoUrl,
        cng: true,
        petrol: true,
        conversionCenter: isConversion,
        oilCenter: isOil,
        cylinderInspection: true,
        cngNozzles: 8,
        pressureBar: 220,
        congestionLevel: 'low',
        waitTimeMinutes: 5,
        verified: true,
        workingHours: '24 ساعة',
        services: [
          'تموين غاز طبيعي مضغوط',
          isConversion ? 'مركز تحويل سيارات' : '',
          isOil ? 'مركز غيار زيوت معتمد' : ''
        ].filter(Boolean),
        updatedAt: new Date().toISOString().substring(0, 16)
      });
    }
  } catch (e) {
    console.error('Error parsing CSV:', e);
  }
  return stations;
}

export function parseGeoJSON(geojsonText: string): Station[] {
  const stations: Station[] = [];
  try {
    const data = JSON.parse(geojsonText);
    const features = data.features || (data.type === 'Feature' ? [data] : []);

    for (let i = 0; i < features.length; i++) {
      const feat = features[i];
      if (!feat.geometry || feat.geometry.type !== 'Point') continue;
      const [lng, lat] = feat.geometry.coordinates;
      const props = feat.properties || {};

      const name = props.name || props.title || `محطة #${i + 1}`;
      let facilityType: CargasFacilityType = (props.facilityType as CargasFacilityType) || 'station';
      if (name.includes('تحويل')) facilityType = 'conversion_center';
      if (name.includes('زيوت')) facilityType = 'oil_center';

      stations.push({
        id: `geojson-${Date.now()}-${i}`,
        name,
        company: props.company || 'كارجاس',
        facilityType,
        address: props.address || props.description || 'موقع من GeoJSON',
        lat,
        lng,
        customLogoUrl: props.logo || props.icon || props.customLogoUrl,
        cng: props.cng !== undefined ? props.cng : true,
        petrol: props.petrol !== undefined ? props.petrol : false,
        conversionCenter: props.conversionCenter ?? (facilityType === 'conversion_center'),
        oilCenter: props.oilCenter ?? (facilityType === 'oil_center'),
        cylinderInspection: true,
        cngNozzles: props.cngNozzles || 8,
        pressureBar: 220,
        congestionLevel: (props.congestionLevel as CongestionLevel) || 'low',
        waitTimeMinutes: props.waitTimeMinutes || 4,
        verified: true,
        workingHours: props.workingHours || '24 ساعة',
        services: props.services || ['تموين غاز طبيعي مضغوط'],
        notes: props.notes || '',
        updatedAt: new Date().toISOString().substring(0, 16)
      });
    }
  } catch (e) {
    console.error('Error parsing GeoJSON:', e);
  }
  return stations;
}

export function exportStationsToKML(stations: Station[]): string {
  const placemarks = stations.map(s => `
    <Placemark>
      <name>${s.name}</name>
      <description><![CDATA[${s.address} | الشركة: ${s.company} | النوع: ${s.facilityType} | غاز: ${s.cng ? 'نعم' : 'لا'} | تحويل: ${s.conversionCenter ? 'نعم' : 'لا'} | زيوت: ${s.oilCenter ? 'نعم' : 'لا'}]]></description>
      <Point>
        <coordinates>${s.lng},${s.lat},0</coordinates>
      </Point>
    </Placemark>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>محطات ومواقع الغاز الطبيعي المعتمدة</name>
    ${placemarks}
  </Document>
</kml>`;
}

export function exportStationsToCSV(stations: Station[]): string {
  const headers = ['اسم المحطة', 'الشركة', 'خط العرض', 'خط الطول', 'النوع', 'العنوان', 'غاز طبيعي', 'مركز تحويل', 'مركز زيوت', 'عدد المسدسات', 'وقت الانتظار'];
  const rows = stations.map(s => [
    `"${s.name}"`,
    `"${s.company}"`,
    s.lat,
    s.lng,
    s.facilityType,
    `"${s.address}"`,
    s.cng ? 'نعم' : 'لا',
    s.conversionCenter ? 'نعم' : 'لا',
    s.oilCenter ? 'نعم' : 'لا',
    s.cngNozzles,
    s.waitTimeMinutes
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}
