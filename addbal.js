import { default as FitParser } from 'https://dmwnz.github.io/damso-analyzer/fit-parser-1.8.4/dist/fit-parser.js'

// const {default: FitParser} = await import('https://dmwnz.github.io/damso-analyzer/fit-parser-1.8.4/dist/fit-parser.js'); 
const req = new XMLHttpRequest();
var fitFileData;
const myFitParser = new FitParser({
  force: true,
  speedUnit: 'km/h',
  lengthUnit: 'km',
  temperatureUnit: 'kelvin',
  elapsedRecordField: true,
  mode: 'list'
});
req.open('GET', `https://www.strava.com/activities/${pageView.activity().id}/export_original`, true);
req.responseType = 'arraybuffer';
req.onload = (event) => {
  const arrayBuffer = req.response;
  if(arrayBuffer) {
    myFitParser.parse(arrayBuffer, function (error, data) {
      if (error) {
        console.log(error);
      } else {
        console.log("Data loaded")
        fitFileData = data;

        pageView.streams().streamData.data.leftrightbalance = fitFileData.records.map(a => {
          const bal = a?.left_right_balance;
          if (bal && bal.value != 127) {
            if (bal.right) {
              return 100-bal.value;
            }
            return bal.value;
          }
          return 50});

        class LeftRightPowerBalanceFormatter extends Strava.I18n.ScalarFormatter  {
          constructor() {
            super('percent', 0)
          }
          format(val) {
            return `${super.format(val)}/${super.format(100-val)}`
          }
        }

        const handleStreamsReady = Strava.Charts.Activities.BasicAnalysisStacked.prototype.handleStreamsReady

        Strava.Charts.Activities.BasicAnalysisStacked.prototype.handleStreamsReady = async function() {
          await sauce.analysis.prepared;
          const stream = 'leftrightbalance';
          const data = this.context.streamsContext.streams.getStream(stream);
          Strava.I18n.Locales.DICTIONARY.strava.charts.activities.chart_context[stream] = 'Équilibre G/D';
          this.context.streamsContext.data.add(stream, data);
          this.streamTypes.push(stream);
          const formatter=LeftRightPowerBalanceFormatter;
          this.context.sportObject().streamTypes[stream] = { formatter };

          await handleStreamsReady.apply(this, arguments);
        }

      }
    });
  }
};

req.send();
