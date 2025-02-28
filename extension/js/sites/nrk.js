// Example URL:
// https://tv.nrk.no/serie/ardna-tv/2016/SAPP67004716
// https://tv.nrk.no/serie/lindmo/2017/MUHU12005817
// https://tv.nrk.no/serie/rapport-fra-nr-24/sesong/1/episode/FALD20007192
// https://tv.nrk.no/serie/ski-nm
// https://tv.nrk.no/serie/side-om-side/sesong/10/episode/1/avspiller
// https://radio.nrk.no/podkast/bjoernen_lyver/l_709fe866-13a5-498d-9fe8-6613a5d98d1f
// https://radio.nrk.no/podkast/bjoernen_lyver/sesong/1/l_68cb20c7-5a8c-4031-8b20-c75a8c003183
// Data URL:
// https://psapi.nrk.no/playback/manifest/program/SAPP67004716
// https://psapi.nrk.no/playback/manifest/program/MUHU12005817
// https://undertekst.nrk.no/prod/SAPP67/00/SAPP67004716AA/NOR/SAPP67004716AA.vtt
// https://psapi.nrk.no/playback/manifest/program/FALD20007192
// https://psapi.nrk.no/playback/metadata/l_709fe866-13a5-498d-9fe8-6613a5d98d1f
// https://psapi.nrk.no/playback/metadata/podcast/bjoernen_lyver/l_68cb20c7-5a8c-4031-8b20-c75a8c003183
// https://psapi.nrk.no/playback/manifest/podcast/l_68cb20c7-5a8c-4031-8b20-c75a8c003183
// https://podkast.nrk.no/fil/bjoernen_lyver/bjoernen_lyver_2018-02-16_1300_760.MP3

import {
  apiError,
  options,
  processPlaylist,
  subtitles,
  updateCommand,
  updateFilename,
} from '../popup.js';
import {
  $,
  extractFilename,
  fetchJson,
  fetchPageData,
  getDocumentTitle,
} from '../utils.js';

async function callback(data) {
  console.log(data);

  if (!data.playable && data.nonPlayable) {
    throw new Error(data.nonPlayable.endUserMessage);
  }

  const streams = $('#streams');
  const subtitleDropdown = $('#subtitles');
  for (const asset of data.playable.assets) {
    const option = document.createElement('option');
    option.value = asset.url;
    option.appendChild(document.createTextNode(extractFilename(asset.url)));
    streams.appendChild(option);

    processPlaylist(asset.url).catch(apiError);
  }

  for (const sub of data.playable.subtitles) {
    const url = sub.webVtt;
    subtitles.push(url);
    const option = document.createElement('option');
    option.value = url;
    option.appendChild(
      document.createTextNode(`Undertext (${sub.label ?? sub.language})`),
    );
    subtitleDropdown.appendChild(option);
  }

  let extension = options.default_video_file_extension;
  if (data.sourceMedium === 'audio') {
    extension = options.default_audio_file_extension;
  }
  let title = data?.statistics?.qualityOfExperience?.title;
  if (!title) {
    title = await getDocumentTitle();
    if (title.endsWith(' - NRK TV')) {
      title = title.substring(0, title.length - ' - NRK TV'.length);
    }
  }
  if (options.add_source_id_to_filename && data.id) {
    title += ` [NRK ${data.id}]`;
  }
  console.log('title', title);
  const filename = `${title}.${extension}`;
  updateFilename(filename);
  updateCommand();
}

function podcastCallback(data) {
  console.log(data);
  const streams = $('#streams');
  for (const [i, asset] of data.playable.assets.entries()) {
    const filename = extractFilename(asset.url);
    if (i === 0) {
      updateFilename(filename);
    }
    const option = document.createElement('option');
    option.value = asset.url;
    option.setAttribute('data-filename', filename);
    option.appendChild(document.createTextNode(filename));
    streams.appendChild(option);
  }
  updateCommand();
}

export default [
  {
    re: /^https?:\/\/radio\.nrk\.no\.?\/serie[^A-Z]*\/([A-Z][A-Z0-9]+)/,
    func: async (ret) => {
      const id = ret[1];
      const dataUrl = `https://psapi.nrk.no/playback/manifest/program/${id}`;
      updateFilename(`${id}.${options.default_audio_file_extension}`);
      console.log(dataUrl);
      const data = await fetchJson(dataUrl, {
        headers: {
          accept: 'application/json',
        },
      });
      await callback(data);
    },
  },
  {
    re: /^https?:\/\/radio\.nrk\.no\.?\/pod[ck]ast\/.+\/(l_[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b)/,
    func: async (ret) => {
      // https://radio.nrk.no/podkast/bjoernen_lyver/l_709fe866-13a5-498d-9fe8-6613a5d98d1f
      // https://psapi.nrk.no/playback/metadata/l_709fe866-13a5-498d-9fe8-6613a5d98d1f
      // https://psapi.nrk.no/playback/manifest/podcast/l_68cb20c7-5a8c-4031-8b20-c75a8c003183
      const dataUrl = `https://psapi.nrk.no/playback/manifest/podcast/${ret[1]}`;
      console.log(dataUrl);

      const data = await fetchJson(dataUrl, {
        headers: {
          accept: 'application/json',
          // This is what the website normally sends:
          // accept: 'application/vnd.nrk.psapi+json; version=9; player=radio-web-player; device=player-core',
        },
      });
      await podcastCallback(data);
    },
  },
  {
    re: /^https?:\/\/radio\.nrk\.no\.?\/serie\/.+\/(l_[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b)/,
    func: async (ret) => {
      // https://radio.nrk.no/serie/tett-paa-norske-artister/sesong/2018/MYNF51000518
      const dataUrl = `https://psapi.nrk.no/playback/manifest/program/${ret[1]}`;
      console.log(dataUrl);

      const data = await fetchJson(dataUrl, {
        headers: {
          accept: 'application/json',
          // This is what the website normally sends:
          // accept: 'application/vnd.nrk.psapi+json; version=9; player=radio-web-player; device=player-core',
        },
      });
      await podcastCallback(data);
    },
  },
  {
    re: /^https?:\/\/(?:tv|radio)\.nrk\.no\.?\//,
    func: async (_, url) => {
      const pageData = await fetchPageData(url, 'pageData');
      if (!pageData) {
        throw new Error(`Hittade ingen sidoinformation.`);
      }
      const prfId = pageData?.initialState?.selectedEpisodePrfId;
      if (!prfId) {
        throw new Error(`Hittade inte prfId.`);
      }

      const dataUrl = `https://psapi.nrk.no/playback/manifest/program/${prfId}`;
      console.log(dataUrl);
      updateFilename(`${prfId}.${options.default_video_file_extension}`);

      const data = await fetchJson(dataUrl, {
        headers: {
          accept: 'application/json',
          // This is what the website normally sends:
          // accept: '*/*',
        },
      });
      await callback(data);
    },
  },
];
