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
          var bal = a?.left_right_balance;
          if (bal && bal.value != 127) {
            if (bal.right) {
              return 100-bal.value;
            }
            return bal.value;
          }
          return 50});

        class KJFormatter extends Strava.I18n.WorkFormatter {
            format(val, prec=1) {
                return super.format(val / 1000, prec);
            }
        }

        class WholePercentFormatter extends Strava.I18n.ScalarFormatter  {
          constructor() {
            super('percent', 0)
          }
        }

        const streamTweaks = {
          w_prime_balance: {
              suggestedMin: () => sauce.analysis.wPrime * 0.50,
              buildRow: (builder, ...args) => builder.buildAreaLine(...args.slice(0, -1), line => {
                  line.groupId('w_prime_balance');
                  const [t, b] = line.yScale().range();
                  const gradPct = value => (line.yScale()(value) - b) / (t - b);
                  const lg = builder.root.append('defs').append('linearGradient');
                  lg.attr({id: 'w-prime-bal-lg', x1: 0, x2: 0, y1: 0, y2: 1});
                  lg.append('stop').attr('offset', gradPct(sauce.analysis.wPrime));
                  lg.append('stop').attr('offset', gradPct(0));
                  lg.append('stop').attr('offset', gradPct(0));
                  lg.append('stop').attr('offset', gradPct(-sauce.analysis.wPrime * 0.25));
              }),
              maxLabel: (data, labelBox, start, end) => {
                  const stream = labelBox.builder().context.getStream(data.streamType)
                      .slice(+start, end == null ? undefined : +end);
                  const fmtr = labelBox.builder().context.formatter(data.streamType);
                  return `${minLocale} ${fmtr.format(d3.min(stream))}`;
              },
          },
          leftrightbalance: {
            maxLabel: (data, labelBox, start, end) => { return '' }
          }
        };

        Strava.Charts.Activities.BasicAnalysisStacked.prototype.handleStreamsReady = async function() {
          await sauce.analysis.prepared;
          const extraStreams = [{
              stream: 'watts_calc',
              formatter: Strava.I18n.PowerFormatter,
              filter: () => !this.context.streamsContext.data.has('watts'),
          }, {
              stream: 'watts',
              formatter: Strava.I18n.PowerFormatter,
          }, {
              stream: 'leftrightbalance',
              formatter: WholePercentFormatter,
              label: 'Équilibre G/D'
          }, {
              stream: 'grade_adjusted_pace',
              formatter: Strava.I18n.ChartLabelPaceFormatter,
              filter: () => sauce.options['analysis-graph-gap'] &&
                  this.context.activity().supportsGap(),
          }, {
              stream: 'w_prime_balance',
              formatter: KJFormatter,
              label: 'W\'bal',
              filter: () => sauce.options['analysis-graph-wbal'],
          }];
          for (const {stream, formatter, label, filter} of extraStreams) {
              if (filter) {
                  let include;
                  try {
                      include = filter();
                  } catch(e) {}
                  if (!include) {
                      const idx = this.streamTypes.indexOf(stream);
                      if (idx !== -1) {
                          this.streamTypes.splice(idx, 1);
                      }
                      continue;
                  }
              }
              const data = this.context.streamsContext.streams.getStream(stream);
              if (this.streamTypes.includes(stream) || !data) {
                  continue;
              }
              if (label) {
                  Strava.I18n.Locales.DICTIONARY.strava.charts.activities
                      .chart_context[stream] = label;
              }
              if (!this.context.streamsContext.data.has(stream)) {
                  this.context.streamsContext.data.add(stream, data);
              }
              this.streamTypes.push(stream);
              this.context.sportObject().streamTypes[stream] = {formatter};
          }
          const rows = [];
          const streams = this.streamTypes.filter(x => !(
              this.context.getStream(x) == null ||
              (x === 'watts_calc' && (this.context.getStream("watts") != null || this.context.trainer())) ||
              (this.showStats && x === 'pace' && !this.showStats.pace)));
          this.setDomainScale();
          this.builder.height(this.stackHeight() * streams.length); 
          const height = this.stackHeight();
          for (const [i, x] of streams.entries()) {
              const stream = this.smoothStreamData(x);
              const tweaks = streamTweaks[x] || {};
              const topY = i * height;
              const yScale = d3.scale.linear();
              const [min, max] = this.streamExtent(x);
              const pad = (max - min) * 0.01;
              yScale.domain([min - pad, max + pad]).range([topY + height, topY]).nice();
              this.yScales()[x] = yScale;
              const coordData = this.context.data(this.xAxisType(), x);
              if (tweaks.buildRow) {
                  tweaks.buildRow(this.builder, coordData, this.xScale, yScale, x, '');
              } else {
                  this.builder.buildLine(coordData, this.xScale, yScale, x, '');
              }
              const graph = this.builder.graphs()[x];
              this.builder.root.select(`rect#${graph.clipPathId()}`).attr({height, y: topY});
              const fmtr = this.context.formatter(x);
              rows.push({
                  streamType: x,
                  topY,
                  avgY: this.yScales()[x](d3.mean(stream)),
                  bottomY: topY + height,
                  label: this.context.getStreamLabel(x),
                  unit: this.context.getUnit(x),
                  min: fmtr.format(min),
                  max: fmtr.format(max),
                  avg: '--'
              });
          }
          this.buildOrUpdateAvgLines(rows);
          this.buildBottomLines(rows);
          this.buildLabelBoxes(rows);
          this.buildListenerBoxes(rows);
          this.buildBrush();
          this.builder.updateRoot();
          this.builder.buildCrossBar();
          this.buildAxis();
          this.setEventDispatcher();
          return this.deferred.resolve();
      };

      }
    });
  }
};

req.send();
