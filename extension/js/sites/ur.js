// https://urplay.se/program/193738-amanda-langtar-sommaren
// https://streaming10.ur.se/urplay/_definst_/mp4:193000-193999/193738-22.mp4/playlist.m3u8

// https://urplay.se/program/175841-ur-samtiden-boy-s-own-den-brittiska-kulturrevolutionen
// https://urplay.se/program/202840-smasagor-piraterna-och-regnbagsskatten

import {
  options,
  updateCommand,
  updateFilename
} from '../popup.js';
import {
  $,
  fetchJson,
  fetchPageData,
  getDocumentTitle
} from '../utils.js';

async function fetchProgram(programId, title) {
  console.log('programId', programId);
  const sourcesDataUrl = `https://media-api.urplay.se/config-streaming/v1/urplay/sources/${programId}`;
  console.log(sourcesDataUrl);

  const sourcesData = await fetchJson(sourcesDataUrl, {
    headers: {
      accept: 'application/json',
    },
  });
  console.log('sourcesData', sourcesData);

  const dropdown = $('#streams');
  const option = document.createElement('option');
  option.value = sourcesData.sources.hls;
  option.appendChild(document.createTextNode(sourcesData.technicalFormat));
  dropdown.appendChild(option);

  if (!title) {
    title = await getDocumentTitle();
    if (title.endsWith(' | UR Play')) {
      title = title.substring(0, title.length - ' | UR Play'.length);
    }
  }
  if (options.add_source_id_to_filename) {
    title += ` [UR ${programId}]`;
  }
  const extension =
    sourcesData.technicalFormat === 'video'
      ? options.default_video_file_extension
      : options.default_audio_file_extension;

  updateFilename(`${title}.${extension}`);
  updateCommand();
}

export default [
  {
    re: /^https?:\/\/(?:www\.)?urplay\.se\.?\/program\/(\d+)/,
    func: async (ret, url) => {
      const programId = ret[1];
      await fetchProgram(programId);
    },
  },
  {
    re: /^https?:\/\/(?:www\.)?urplay\.se\.?\//,
    func: async (_, url) => {
      const nextData = await fetchPageData(url);
      if (!nextData) {
        throw new Error(`Hittade ingen sidoinformation.`);
      }
      const program = nextData?.props?.pageProps?.program;
      if (!program) {
        throw new Error(`Hittade ingen programinformation.`);
      }
      let title = program.title;
      if (program.seriesTitle) {
        title = `${program.seriesTitle} - ${title}`;
      }
      await fetchProgram(program.id, title);
    },
  },
];
