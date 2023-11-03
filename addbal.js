import { default as FitParser } from 'https://dmwnz.github.io/damso-analyzer/fit-parser-1.8.4/dist/fit-parser.js'

async function parseFitFile(arrayBuffer) {
  const myFitParser = new FitParser({
    force: true,
    speedUnit: 'km/h',
    lengthUnit: 'km',
    temperatureUnit: 'kelvin',
    elapsedRecordField: true,
    mode: 'list'
  });
  return new Promise((resolve, reject) => {
    myFitParser.parse(arrayBuffer, (error, data) => {
        error ? reject(error) : resolve(data);
    });
  });
}

async function fetchAndLoadLRData() {
  const fitResponse = await fetch(`https://www.strava.com/activities/${pageView.activity().id}/export_original`);
  const arrayBuffer = await fitResponse.arrayBuffer();
  const parsedFitFile = await parseFitFile(arrayBuffer);
  const LRbal = parsedFitFile.records.map(a => (a?.left_right_balance && a.left_right_balance.value !== 127) ? (a.left_right_balance.right ? 100 - a.left_right_balance.value : a.left_right_balance.value) : 50);
  pageView.streams().streamData.data.leftrightbalance = LRbal;
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
const handleStreamsReady = Strava.Charts.Activities.BasicAnalysisStacked.prototype.handleStreamsReady;
Strava.Charts.Activities.BasicAnalysisStacked.prototype.handleStreamsReady = async function() {
  await sauce.analysis.prepared;
  await fetchedLRData;
  const stream = 'leftrightbalance';
  if (!this.streamTypes.includes(stream)) {
    const data = this.context.streamsContext.streams.getStream(stream);
    this.context.streamsContext.data.add(stream, data);
    this.streamTypes.push(stream);
    const formatter=LeftRightPowerBalanceFormatter;
    this.context.sportObject().streamTypes[stream] = { formatter };
    Strava.I18n.Locales.DICTIONARY.strava.charts.activities.chart_context[stream] = 'Équilibre G/D';
  }
  await handleStreamsReady.apply(this, arguments);
}

