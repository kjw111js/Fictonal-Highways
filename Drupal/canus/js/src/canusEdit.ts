interface coordsType {latitude: string; longitude: string; distance: number; state?: string; upperAdmin?: string; lowerAdmin?: string; locality?: string; spot?: string;}
interface gjType {data: coordsType[];}
interface localeType {state: string; upperAdmin: string; lowerAdmin: string; locality: string; spot: string;}
interface addressGMType {long_name: string; short_name: string; types: string[];}
interface resultsGMType {address_components: addressGMType[];}
interface addressOSType {house_number?: string; road?: string; city?: string; town?: string; village?: string; hamlet?: string; township?: string; county?: string; state?: string;}
interface glType {results: resultsGMType[]; address: addressOSType;}
interface NumberConstructor {readonly EPSILON: number;}

document.getElementById('convertKML').addEventListener('click', (event) => {
  convertKML();
});

function convertKML (): void {
  const convertBox: HTMLTextAreaElement = document.getElementById('dataBox') as HTMLTextAreaElement;
  const cleanCoords: string = convertBox.value.substring(convertBox.value.indexOf('<coordinates>') + 13,convertBox.value.indexOf('</coordinates>')).replace(/\s/gm,'').replace(/,0/g,'/').replace(/\/$/,'');
  const splitCoords: string[] = cleanCoords.split('/');
  let setData: gjType = {'data': []};
  let distanceSegment: number = 0;
  splitCoords.forEach(cloopSegments);
  
  function cloopSegments (cgetSegment: string, cindexSegment: number): void {
    const splitSegments: string[] = cgetSegment.split(',');
    if (cindexSegment > 0) {
      distanceSegment += calcDistance(Number(setData.data[cindexSegment - 1].latitude),Number(setData.data[cindexSegment - 1].longitude),Number(splitSegments[1]),Number(splitSegments[0]));
    }
    setData.data.push({'latitude': splitSegments[1], 'longitude': splitSegments[0], 'distance': distanceSegment});
  }
  
  convertBox.value = JSON.stringify(setData);
  convertBox.focus();
  convertBox.select();
  document.execCommand('copy');
}

function calcDistance (lat1: number,lon1: number,lat2: number,lon2: number): number {
  const radlat1: number = Math.PI * lat1/180;
  const radlat2: number = Math.PI * lat2/180;
  const theta: number = lon1-lon2;
  const radtheta: number = Math.PI * theta/180;
  let dist: number = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
  if (dist > 1) {
    dist = 1;
  }
  dist = Math.acos(dist);
  dist = dist * 180/Math.PI;
  dist = dist * 60 * 1.1515;
  return Math.round((dist + Number.EPSILON) * 100) / 100;
}

document.getElementById('addGMLocales').addEventListener('click', (event) => {
  addLocales('gm');
});

document.getElementById('addOSLocales').addEventListener('click', (event) => {
  addLocales('os');
});

function addLocales (glService: string): void {
  const localeBox: HTMLTextAreaElement = document.getElementById('dataBox') as HTMLTextAreaElement;
  let getPath: gjType = JSON.parse(localeBox.value);
  let localeLoopCount: number = 0;
  let localeFetchCount: number = 0;
  let localeLimit: number = 0;
  glService == 'gm' ? 500 : 5000;
  getPath.data.forEach(aloopSegments);
  
  function aloopSegments (agetSegment: coordsType, aindexSegment: number): void {
    if (localeLoopCount <= localeLimit) {
      //Lat, long, and distance are the only starting keys
      if (Object.keys(agetSegment).length == 3) {
        let setLocale: Promise<localeType> = new Promise(async function(glResolve) {
          let glPath: string = '';
          if (glService == 'gm') {
            glPath = 'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + Number(agetSegment.latitude) + ',' + Number(agetSegment.longitude) + '&key=[YOUR KEY]'
          }
          else {
            glPath = 'https://nominatim.openstreetmap.org/reverse?lat=' + Number(agetSegment.latitude) + '&lon=' + Number(agetSegment.longitude) + '&format=jsonv2';
          }
          const fetchLocale: Response = await fetch(glPath);
          const getLocale: glType = await fetchLocale.json();
          let dataLocale: localeType = {'state': '', 'upperAdmin': '','lowerAdmin': '', 'locality': '', 'spot': ''};
          glService == 'gm' ? getLocale.results[0].address_components.forEach(parseGMAddress) : parseOSAddress();

          function parseGMAddress (getAddress: addressGMType): void {
            if (getAddress.types[0] == 'establishment') {
              dataLocale.spot = getAddress.long_name;
            }
            else if (getAddress.types[0] == 'locality') {
              dataLocale.locality = getAddress.long_name;
            }
            else if (getAddress.types[0] == 'administrative_area_level_3') {
              dataLocale.lowerAdmin = getAddress.long_name;
            }
            else if (getAddress.types[0] == 'administrative_area_level_2') {
              dataLocale.upperAdmin = getAddress.long_name;
            }
            else if (getAddress.types[0] == 'administrative_area_level_1') {
              dataLocale.state = getAddress.long_name;
            }
          }
          
          function parseOSAddress (): void {
            if (getLocale.address.house_number) {
              dataLocale.spot = getLocale.address.house_number + ' ';
            }
            if (getLocale.address.road) {
              dataLocale.spot += getLocale.address.road;
            }
            const localTypes: string[] = ['city','town','village','hamlet'];
            localTypes.forEach(parseOSLocality);
            if (getLocale.address.township) {
              dataLocale.lowerAdmin = getLocale.address.township;
            }
            if (getLocale.address.county) {
              dataLocale.upperAdmin = getLocale.address.county;
            }
            if (getLocale.address.state) {
              dataLocale.state = getLocale.address.state;
            }
          }
          
          function parseOSLocality (localType: string): void {
            if (getLocale.address[localType as keyof typeof getLocale.address]) {
              dataLocale.locality = getLocale.address[localType as keyof typeof getLocale.address];
            }
          }
          
          glResolve(dataLocale);
        });
        setLocale.then((valuesLocale: localeType) => {
          agetSegment.state = valuesLocale.state;
          agetSegment.upperAdmin = valuesLocale.upperAdmin;
          agetSegment.lowerAdmin = valuesLocale.lowerAdmin;
          agetSegment.locality = valuesLocale.locality;
          agetSegment.spot = valuesLocale.spot;
          getPath.data[aindexSegment] = agetSegment;
          localeFetchCount++;
          if (localeFetchCount == localeLimit || aindexSegment == getPath.data.length - 1) {
            localeBox.value = JSON.stringify(getPath);
          }
        });
        localeLoopCount++;
      }
    }
  }
}
