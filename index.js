// rtl_power -f 380.0M:383.25M:50k -g 50 -i 0 -P
// rtl_power -f 383.25M:386.5M:50k -g 50 -i 0 -P

const { spawn, exec } = require('child_process');

// MHz
const frequencies = [
  ['380.0', '386.5', '-30'],
  ['390.0', '396.5', '-12'],
];

const gain = 50;
const bin = 125; // k

(() => {
  frequencies.map(([start, end, treshold], i) => {
    const child = spawn('rtl_power', [
      `-f ${start}M:${end}M:${bin}k`, // lower:upper:bin_size
      `-g ${gain}`, // Tuner gain
      '-i 1', // Interval (seconds)
      `-d ${i}`, // Device index
      '-P', // Hold peak
    ]);

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (data) => {
      const lines = data.split(/\r?\n/).filter((line) => !!line);

      const rangeData = lines.map((line) => {
        const [date, time, low, high, step, sampleCount, ...samples] = line.split(', ');

        return {
          i,
          date,
          time,
          low,
          high,
          step,
          sampleCount,
          samples,
        };
      });

      // console.log(rangeData);

      const completeSamples = rangeData.reduce((a, { samples }) => [...a, ...samples], []);

      const filteredSamples = completeSamples.filter((dBm) => dBm < treshold);

      console.log(`Data detected between ${start} - ${end}`);
      console.log(filteredSamples.join(' '));
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (data) => {
      if (['Error', 'Failed'].map((ec) => data.indexOf(ec)).some((v) => v !== -1)) {
        console.log(`stderr: ${data}`);
        exec('killall rtl_power');
      }
      console.log(data);
    });

    child.on('close', (code) => {
      console.log(`closing code: ${code}`);
    });
  });
})();

process.on('SIGINT', () => {
  console.info('SIGINT signal received.');
});
