// SVT Play:
// Example URL:
// https://www.svtplay.se/video/e7Yd7x9/rapport/igar-22-00?id=e7Yd7x9
// Data URL:
// https://api.svt.se/video/e7Yd7x9
//
// Example URL:
// https://www.svtplay.se/video/2520376/pippi-langstrump/pippi-langstrump-sasong-1-avsnitt-1
// Data URL:
// https://api.svt.se/video/2520376
//
// https://www.svtplay.se/klipp/22725758/har-ar-historien-bakom-sma-grodorna
// https://api.svt.se/video/22725758
//
// SVT Play Live:
// Example URL:
// https://www.svtplay.se/kanaler/svt1
// https://www.svtplay.se/kanaler/svt2
// https://www.svtplay.se/kanaler/svtbarn
// https://www.svtplay.se/kanaler/kunskapskanalen
// https://www.svtplay.se/kanaler/svt24
// https://www.svtplay.se/kanaler?selectedChannel=svt1
// Data URL:
// https://api.svt.se/video/ch-svt1
// https://api.svt.se/video/ch-svt2
// https://api.svt.se/video/ch-barnkanalen
// https://api.svt.se/video/ch-kunskapskanalen
// https://api.svt.se/video/ch-svt24
//
// SVT:
// Example URL:
// https://www.svt.se/nyheter/utrikes/ovanlig-eldring-over-nord-och-sydamerika
// Article Data URL:
// https://api.svt.se/nss-api/page/nyheter/utrikes/ovanlig-eldring-over-nord-och-sydamerika?q=articles
// Media Data URL:
// https://api.svt.se/video/KrQbGGd
//
// https://www.svt.se/recept/julvort
// Trasig!
//
// https://www.svt.se/recept/nyponvinager
// https://api.svt.se/video/33001262
//
// Example URL:
// https://www.svt.se/barnkanalen/barnplay/gamingdrommar-live/j1a3m2y/
// Media Data URL:
// https://api.svt.se/video/j1a3m2y

import {
  api_error,
  info,
  master_callback,
  options,
  subtitles,
  update_cmd,
  update_filename,
  update_json_url,
} from '../popup.js';
import {
  $,
  extract_filename,
  fetchDOM,
  flatten,
  get_json,
  get_text,
  isFirefox,
} from '../utils.js';

function svt_callback(data) {
  console.log(data);

  const formats = 'hls,hds'.split(',');
  const streams = $('#streams');
  for (const stream of data.videoReferences
    .filter((stream) => formats.includes(stream.format))
    .sort((a, b) => formats.indexOf(a.format) - formats.indexOf(b.format))) {
    if (stream.format === 'hds') {
      stream.url = add_param(stream.url, 'hdcore=3.5.0'); // ¯\_(ツ)_/¯
    }

    const option = document.createElement('option');
    option.value = stream.url;
    option.appendChild(document.createTextNode(extract_filename(stream.url)));
    streams.appendChild(option);

    if (stream.format === 'hls') {
      const base_url = stream.url.replace(/\/[^/]+$/, '/');
      fetch(stream.url)
        .then(get_text)
        .then(master_callback(data.contentDuration, base_url))
        .catch(api_error);
    }
  }

  if (data.subtitleReferences) {
    subtitles.push(...data.subtitleReferences.map((s) => s.url));
    for (const sub of data.subtitleReferences) {
      const option = document.createElement('option');
      option.value = sub.url;
      option.appendChild(document.createTextNode(extract_filename(sub.url)));
      streams.appendChild(option);
    }
  }

  if (
    data.programTitle &&
    data.episodeTitle &&
    data.programTitle !== data.episodeTitle
  ) {
    update_filename(
      `${data.programTitle.trim()} - ${data.episodeTitle.trim()}.${
        options.default_video_file_extension
      }`,
    );
  } else if (data.programTitle) {
    update_filename(
      `${data.programTitle.trim()}.${options.default_video_file_extension}`,
    );
  } else if (data.episodeTitle) {
    update_filename(
      `${data.episodeTitle.trim()}.${options.default_video_file_extension}`,
    );
  }
  update_cmd();
}

export default [
  {
    re: /^https?:\/\/(?:www\.)?svtplay\.se\.?\/kanaler(?:\/([^\/?]+)|\?selectedChannel=([^\/?]+))/,
    func: (ret) => {
      let ch = ret[1] || ret[2];
      if (ch === 'svtbarn') {
        ch = 'barnkanalen';
      }
      const data_url = `https://api.svt.se/video/ch-${ch}`;
      update_json_url(data_url);
      fetch(data_url).then(get_json).then(svt_callback).catch(api_error);
    },
  },
  {
    re: /^https?:\/\/(?:www\.)?svtplay\.se\.?\/(?:video|klipp)\/([a-zA-Z0-9]+)\//,
    func: (ret) => {
      console.log(ret);
      const videoId = ret[1];
      const data_url = `https://api.svt.se/video/${videoId}`;
      update_filename(`${videoId}.${options.default_video_file_extension}`);
      update_json_url(data_url);
      console.log(data_url);
      fetch(data_url).then(get_json).then(svt_callback).catch(api_error);
    },
  },
  {
    re: /^https?:\/\/(?:www\.)?svt\.se\.?\/videoplayer-embed\/(\d+)/,
    func: (ret) => {
      const video_id = ret[1];
      const data_url = `https://api.svt.se/videoplayer-api/video/${video_id}`;
      update_filename(`${video_id}.mp4`);
      update_json_url(data_url);
      console.log(data_url);
      fetch(data_url).then(get_json).then(svt_callback).catch(api_error);
    },
  },
  {
    re: /^https?:\/\/(?:www\.)?svt\.se\.?\/recept\//,
    permissions: isFirefox
      ? {
          origins: ['https://www.svt.se/'],
        }
      : null,
    func: async (ret, url) => {
      const doc = await fetchDOM(url);
      const data = JSON.parse(doc.querySelector('#__NEXT_DATA__').textContent);
      console.log(data);

      const videoIds = Object.values(data.props.pageProps.__APOLLO_STATE__)
        .map((v) => v.videoId)
        .filter(Boolean);

      for (const videoId of videoIds) {
        const data_url = `https://api.svt.se/video/${videoId}`;
        update_filename(`${videoId}.${options.default_video_file_extension}`);
        update_json_url(data_url);
        console.log(data_url);
        fetch(data_url).then(get_json).then(svt_callback).catch(api_error);
      }

      if (videoIds.length === 0) {
        info('Hittade ingen video.');
      }
    },
  },
  {
    re: /^https?:\/\/(?:www\.)?svt\.se\.?\//,
    func: async (_, url) => {
      let ret;
      if (
        (ret = /^(?:\/barnkanalen)?\/barnplay\/([^/]+)\/([^/?]+)/.exec(
          url.pathname,
        ))
      ) {
        const data_url = `https://api.svt.se/video/${ret[2]}`;
        update_filename(`${ret[1]}.${options.default_video_file_extension}`);
        update_json_url(data_url);
        console.log(data_url);
        fetch(data_url).then(get_json).then(svt_callback).catch(api_error);
        return;
      }

      const data = await fetch(
        `https://api.svt.se/nss-api/page${url.pathname}?q=articles`,
      )
        .then(get_json)
        .catch(api_error);
      console.log(data);
      if (!data) return;

      let ids = flatten(
        data.articles.content
          .filter((a) => a.media)
          .map((article) =>
            article.media
              .filter((m) => m.image && m.image.isVideo && m.image.svtId)
              .map((m) => m.image.svtId),
          ),
      );
      console.log(ids);

      for (const svtId of ids) {
        const data_url = `https://api.svt.se/video/${svtId}`;
        update_filename(`${svtId}.${options.default_video_file_extension}`);
        update_json_url(data_url);
        console.log(data_url);
        fetch(data_url).then(get_json).then(svt_callback).catch(api_error);
      }

      if (ids.length === 0) {
        info('Hittade ingen video.');
      }
    },
  },
];
