import { Station, CompanyName, CongestionLevel } from '../types';

export function parseKML(kmlText: string): Station[] {
  const stations: Station[] = [];
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlText, 'text/xml');
    const placemarks = xmlDoc.getElementsByTagName('Placemark');

    for (let i = 0; i < placemarks.length; i++) {
      const pm = placemarks[i];
      const nameElem = pm.getElementsByTagName('name')[0];
      const name = nameElem ? nameElem.textContent?.trim() || `محطة مستوردة #${i + 1}` : `محطة مستوردة #${i + 1}`;

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

      // Detect company from name or description
      let company: CompanyName = 'أخرى';
      const textToSearch = (name + ' ' + description).toLowerCase();
      if (textToSearch.includes('كارجاس') || textToSearch.includes('cargas')) company = 'كارجاس';
      else if (textToSearch.includes('عربية غاز') || textToSearch.includes('arabia gas')) company = 'عربية غاز';
      else if (textToSearch.includes('غازتك') || textToSearch.includes('gastec')) company = 'غازتك';
      else if (textToSearch.includes('ماستر جاس') || textToSearch.includes('master gas') || textToSearch.includes('طاقة')) company = 'ماستر جاس';
      else if (textToSearch.includes('وطنية') || textToSearch.includes('wataniya') || textToSearch.includes('chillout')) company = 'وطنية';

      // Detect CNG & Petrol
      const hasCng = textToSearch.includes('غاز') || textToSearch.includes('cng') || company !== 'أخرى';
      const hasPetrol = textToSearch.includes('بنزين') || textToSearch.includes('petrol') || textToSearch.includes('92') || textToSearch.includes('95');

      stations.push({
        id: `kml-import-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        name,
        company,
        address: description || 'تم الاستيراد من Google Earth / KML',
        lat,
        lng,
        cng: hasCng,
        petrol: hasPetrol,
        cngNozzles: 8,
        congestionLevel: 'low',
        waitTimeMinutes: 4,
        verified: true, // Imported by user from their trusted Google Earth collection
        workingHours: '24 ساعة',
        conversionCenter: textToSearch.includes('تحويل') || textToSearch.includes('صيانة'),
        cylinderInspection: true,
        services: ['غاز طبيعي مضغوط (تم التحقق)'],
        notes: `مستوردة من Google Earth: ${description}`.substring(0, 200),
        updatedAt: new Date().toISOString().substring(0, 16)
      });
    }
  } catch (err) {
    console.error('Error parsing KML:', err);
  }
  return stations;
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

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 2) continue;

      const lat = parseFloat(cols[latIdx !== -1 ? latIdx : 1]);
      const lng = parseFloat(cols[lngIdx !== -1 ? lngIdx : 2]);
      if (isNaN(lat) || isNaN(lng)) continue;

      const name = cols[nameIdx !== -1 ? nameIdx : 0] || `محطة #${i}`;
      const rawComp = (cols[companyIdx !== -1 ? companyIdx : 3] || '').trim();
      let company: CompanyName = 'كارجاس';
      if (rawComp.includes('عربية')) company = 'عربية غاز';
      else if (rawComp.includes('غازتك')) company = 'غازتك';
      else if (rawComp.includes('ماستر')) company = 'ماستر جاس';
      else if (rawComp.includes('وطنية')) company = 'وطنية';

      stations.push({
        id: `csv-import-${Date.now()}-${i}`,
        name,
        company,
        address: cols[addrIdx !== -1 ? addrIdx : 4] || 'عنوان مخصص',
        lat,
        lng,
        cng: true,
        petrol: true,
        cngNozzles: 8,
        congestionLevel: 'low',
        waitTimeMinutes: 5,
        verified: true,
        workingHours: '24 ساعة',
        conversionCenter: false,
        cylinderInspection: true,
        services: ['غاز طبيعي مضغوط'],
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

      const name = props.name || props.title || `محطة مستوردة #${i + 1}`;
      stations.push({
        id: `geojson-${Date.now()}-${i}`,
        name,
        company: (props.company as CompanyName) || 'كارجاس',
        address: props.address || props.description || 'موقع مستورد من GeoJSON',
        lat,
        lng,
        cng: props.cng !== undefined ? props.cng : true,
        petrol: props.petrol !== undefined ? props.petrol : false,
        cngNozzles: props.cngNozzles || 8,
        congestionLevel: (props.congestionLevel as CongestionLevel) || 'low',
        waitTimeMinutes: props.waitTimeMinutes || 4,
        verified: true,
        workingHours: props.workingHours || '24 ساعة',
        conversionCenter: !!props.conversionCenter,
        cylinderInspection: true,
        services: props.services || ['غاز طبيعي مضغوط'],
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
      <name><![CDATA[${s.name} (${s.company})]]></name>
      <description><![CDATA[${s.address} | غاز: ${s.cng ? 'نعم' : 'لا'} | انتظار: ${s.waitTimeMinutes} دقيقة | نقاط تموين: ${s.cngNozzles}]]></description>
      <Point>
        <coordinates>${s.lng},${s.lat},0</coordinates>
      </Point>
    </Placemark>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>محطات الغاز الطبيعي المعتمدة - تطبيق معين</name>
    <description>بيانات محطات كارجاس وعربية غاز وغازتك وماستر جاس المعتمدة</description>
    ${placemarks}
  </Document>
</kml>`;
}

export function exportStationsToCSV(stations: Station[]): string {
  const header = 'Name,Company,Latitude,Longitude,Address,CNG,Petrol,WaitTimeMin,Verified,Nozzles\n';
  const rows = stations.map(s => 
    `"${s.name.replace(/"/g, '""')}","${s.company}",${s.lat},${s.lng},"${s.address.replace(/"/g, '""')}",${s.cng},${s.petrol},${s.waitTimeMinutes},${s.verified},${s.cngNozzles}`
  ).join('\n');
  return header + rows;
}
