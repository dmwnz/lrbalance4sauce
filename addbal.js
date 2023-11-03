import { default as FitParser } from 'https://dmwnz.github.io/damso-analyzer/fit-parser-1.8.4/dist/fit-parser.js'

function checkFitSanity(buffer) {
  var blob = new Uint8Array(buffer);
  if (blob.length < 12) {
    throw Error('File to small to be a FIT file');
  }
  var headerLength = blob[0];
  if (headerLength !== 14 && headerLength !== 12) {
    throw Error('Incorrect header size');
  }
  var fileTypeString = '';
  for (var i = 8; i < 12; i++) {
    fileTypeString += String.fromCharCode(blob[i]);
  }
  if (fileTypeString !== '.FIT') {
    throw Error('Missing \'.FIT\' in header', {});
  }
}

async function parseFitFile(arrayBuffer) {
  checkFitSanity(arrayBuffer);
  const myFitParser = new FitParser();
  return new Promise((resolve, reject) => {
    myFitParser.parse(arrayBuffer, (error, data) => {
        error ? reject(error) : resolve(data);
    });
  });
}

function extractLRBalFromFitData(fitData) {
  var hasLRBalance = false;
  const LRbal = fitData.records.map(a => {
    const bal = a?.left_right_balance;
    hasLRBalance = hasLRBalance || (bal!=undefined);
    return bal && bal.value !== 127 ? (bal.right ? 100 - bal.value : bal.value) : 50;
  });
  if (!hasLRBalance) {
    throw Error('No L/R balance data found in original FIT file');
  }
  return LRbal;
}

async function fetchAndLoadLRData() {
  if (!pageView.isOwner()) {
    throw Error('Activity doesn\'t belong to logged-in athlete')
  }
  const fitResponse = await fetch(`https://www.strava.com/activities/${pageView.activity().id}/export_original`);
  const arrayBuffer = await fitResponse.arrayBuffer();
  const parsedFitFile = await parseFitFile(arrayBuffer);
  const LRBal = extractLRBalFromFitData(parsedFitFile);
  
  pageView.streams().streamData.data.leftrightbalance = LRBal;
}

class LeftRightPowerBalanceFormatter extends Strava.I18n.ScalarFormatter  {
  constructor() {
    super('percent', 0);
  }
  format(val) {
    return `${super.format(val)}/${super.format(100-val)}`; 
  }
}

const fetchedLRData = fetchAndLoadLRData();
fetchedLRData.catch(_=>undefined);
const handleStreamsReady = Strava.Charts.Activities.BasicAnalysisStacked.prototype.handleStreamsReady;
Strava.Charts.Activities.BasicAnalysisStacked.prototype.handleStreamsReady = async function() {
  try {
    await fetchedLRData;
    const stream = 'leftrightbalance';
    const data = this.context.streamsContext.streams.getStream(stream);
    if (data && !this.streamTypes.includes(stream)) {
      this.context.streamsContext.data.add(stream, data);
      this.streamTypes.push(stream);
      const formatter=LeftRightPowerBalanceFormatter;
      this.context.sportObject().streamTypes[stream] = { formatter };
      Strava.I18n.Locales.DICTIONARY.strava.charts.activities.chart_context[stream] = 'Équilibre G/D';
    }
  }
  catch (error) {
    console.error(`Could not load L/R balance data: ${error}`);
  }
  await handleStreamsReady.apply(this, arguments);
}

