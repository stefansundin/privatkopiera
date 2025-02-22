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
  api_error,
  options,
  processPlaylist,
  subtitles,
  tab_id,
  update_cmd,
  update_filename,
} from '../popup.js';
import {
  $,
  extract_filename,
  fetchJson,
  fetchNextData,
  getDocumentTitle,
  parse_pt,
} from '../utils.js';

async function nrk_callback(data) {
  console.log(data);

  const streams = $('#streams');
  const duration = parse_pt(data.playable.duration);
  for (const asset of data.playable.assets) {
    const option = document.createElement('option');
    option.value = asset.url;
    option.appendChild(document.createTextNode(extract_filename(asset.url)));
    streams.appendChild(option);

    processPlaylist(asset.url, duration).catch(api_error);
  }

  for (const subtitle of data.playable.subtitles) {
    const url = subtitle.webVtt;
    subtitles.push(url);
    const option = document.createElement('option');
    option.value = url;
    option.appendChild(
      document.createTextNode(`Undertext (${subtitle.label})`),
    );
    streams.appendChild(option);
  }

  let ext = options.default_video_file_extension;
  if (data.sourceMedium === 'audio') {
    ext = options.default_audio_file_extension;
  }
  const title = await getDocumentTitle(tab_id);
  if (title) {
    const fn = `${title}.${ext}`;
    update_filename(fn);
  }
  update_cmd();
}

function nrk_podcast_callback(data) {
  console.log(data);
  const streams = $('#streams');
  for (const [i, asset] of data.playable.assets.entries()) {
    const fn = extract_filename(asset.url);
    if (i === 0) {
      update_filename(fn);
    }
    const option = document.createElement('option');
    option.value = asset.url;
    option.setAttribute('data-filename', fn);
    option.appendChild(document.createTextNode(fn));
    streams.appendChild(option);
  }
  update_cmd();
}

export default [
  {
    re: /^https?:\/\/radio\.nrk\.no\.?\/serie[^A-Z]*\/([A-Z][A-Z0-9]+)/,
    func: async (ret) => {
      const id = ret[1];
      const data_url = `https://psapi.nrk.no/playback/manifest/program/${id}`;
      update_filename(`${id}.${options.default_audio_file_extension}`);
      console.log(data_url);
      const data = await fetchJson(data_url, {
        headers: {
          accept: 'application/json',
        },
      });
      await nrk_callback(data);
    },
  },
  {
    re: /^https?:\/\/radio\.nrk\.no\.?\/pod[ck]ast\/.+\/(l_[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b)/,
    func: async (ret) => {
      // https://radio.nrk.no/podkast/bjoernen_lyver/l_709fe866-13a5-498d-9fe8-6613a5d98d1f
      // https://psapi.nrk.no/playback/metadata/l_709fe866-13a5-498d-9fe8-6613a5d98d1f
      // https://psapi.nrk.no/playback/manifest/podcast/l_68cb20c7-5a8c-4031-8b20-c75a8c003183
      const data_url = `https://psapi.nrk.no/playback/manifest/podcast/${ret[1]}`;
      console.log(data_url);

      const data = await fetchJson(data_url, {
        headers: {
          accept: 'application/json',
          // This is what the website normally sends:
          // accept: 'application/vnd.nrk.psapi+json; version=9; player=radio-web-player; device=player-core',
        },
      });
      await nrk_podcast_callback(data);
    },
  },
  {
    re: /^https?:\/\/radio\.nrk\.no\.?\/serie\/.+\/(l_[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b)/,
    func: async (ret) => {
      // https://radio.nrk.no/serie/tett-paa-norske-artister/sesong/2018/MYNF51000518
      const data_url = `https://psapi.nrk.no/playback/manifest/program/${ret[1]}`;
      console.log(data_url);

      const data = await fetchJson(data_url, {
        headers: {
          accept: 'application/json',
          // This is what the website normally sends:
          // accept: 'application/vnd.nrk.psapi+json; version=9; player=radio-web-player; device=player-core',
        },
      });
      await nrk_podcast_callback(data);
    },
  },
  {
    re: /^https?:\/\/(?:tv|radio)\.nrk\.no\.?\//,
    func: async (_, url) => {
      const pageData = await fetchNextData(url, 'pageData');
      if (!pageData) {
        throw new Error(`Hittade ingen sidoinformation.`);
      }
      const prfId = pageData?.initialState?.selectedEpisodePrfId;
      if (!prfId) {
        throw new Error(`Hittade inte prfId.`);
      }

      const dataUrl = `https://psapi.nrk.no/playback/manifest/program/${prfId}`;
      console.log('dataUrl', dataUrl);
      update_filename(`${prfId}.${options.default_video_file_extension}`);

      const data = await fetchJson(dataUrl, {
        headers: {
          accept: 'application/json',
          // This is what the website normally sends:
          // accept: '*/*',
        },
      });
      await nrk_callback(data);
    },
  },
];
