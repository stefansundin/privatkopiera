// https://urplay.se/program/193738-amanda-langtar-sommaren
// https://streaming10.ur.se/urplay/_definst_/mp4:193000-193999/193738-22.mp4/playlist.m3u8

// https://urplay.se/program/175841-ur-samtiden-boy-s-own-den-brittiska-kulturrevolutionen
// https://urplay.se/program/202840-smasagor-piraterna-och-regnbagsskatten

import { api_error, options, update_cmd, update_filename } from '../popup.js';
import { $, fetchJson, fetchNextData } from '../utils.js';

function ur_callback(domain, data) {
  const program = data.program;
  console.log('program', program);

  const streams = [];
  if (
    program.streamingInfo.sweComplete &&
    program.streamingInfo.sweComplete.hd
  ) {
    streams.push({
      info: 'HD med undertexter',
      url: `https://${domain}/${program.streamingInfo.sweComplete.hd.location}playlist.m3u8`,
    });
  }
  if (program.streamingInfo.raw && program.streamingInfo.raw.hd) {
    streams.push({
      info: 'HD',
      url: `https://${domain}/${program.streamingInfo.raw.hd.location}playlist.m3u8`,
    });
  }
  if (
    program.streamingInfo.sweComplete &&
    program.streamingInfo.sweComplete.sd
  ) {
    streams.push({
      info: 'SD med undertexter',
      url: `https://${domain}/${program.streamingInfo.sweComplete.sd.location}playlist.m3u8`,
    });
  }
  if (program.streamingInfo.raw) {
    for (const [key, value] of Object.entries(program.streamingInfo.raw)) {
      if (!value.location) {
        continue;
      }
      const url = `https://${domain}/${value.location}playlist.m3u8`;
      if (streams.some((s) => s.url === url)) {
        continue;
      }
      streams.push({
        info: key.toUpperCase(),
        url: url,
      });
    }
  }
  console.log('stream', streams);

  const dropdown = $('#streams');
  for (const stream of streams) {
    const option = document.createElement('option');
    option.value = stream.url;
    option.appendChild(document.createTextNode(stream.info));
    dropdown.appendChild(option);
  }

  const ext =
    program.format === 'video'
      ? options.default_video_file_extension
      : options.default_audio_file_extension;
  let fn = `${program.title?.trim()}.${ext}`;
  if (program.seriesTitle) {
    fn = `${program.seriesTitle.trim()} - ${fn}`;
  }
  update_filename(fn);
  update_cmd();
}

export default [
  {
    re: /^https?:\/\/(?:www\.)?urplay\.se\.?\//,
    func: async (ret, url) => {
      const data = await fetchNextData(url);
      const lb_url = 'https://streaming-loadbalancer.ur.se/loadbalancer.json';
      fetchJson(lb_url)
        .then((lb_data) => ur_callback(lb_data.redirect, data.props.pageProps))
        .catch(api_error);
    },
  },
];
