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
// https://www.svtplay.se/klipp/jVwXaEx/vem-ar-han-egentligen
// https://api.svt.se/video/jVwXaEx
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
// https://recept.svt.se/julvort
// https://api.svt.se/video/1398771-001A
//
// https://recept.svt.se/nyponvinager
// https://api.svt.se/video/33001262
//
// Example URL:
// https://www.svt.se/barnkanalen/barnplay/gamingdrommar-live/j1a3m2y/
// Media Data URL:
// https://api.svt.se/video/j1a3m2y

import {
  apiError,
  info,
  options,
  processPlaylist,
  subtitles,
  updateCommand,
  updateFilename,
} from '../popup.js';
import { $, extractFilename, fetchDOM, fetchJson, fetchPageData } from '../utils.js';

function callback(data, fetchPlaylist=true) {
  console.log(data);

  let title;
  if (
    data.programTitle &&
    data.episodeTitle &&
    data.programTitle !== data.episodeTitle
  ) {
    title = `${data.programTitle.trim()} - ${data.episodeTitle.trim()}`;
  } else if (data.programTitle) {
    title = data.programTitle.trim();
  } else if (data.episodeTitle) {
    title = data.episodeTitle.trim();
  }

  // Try to pull out the desired videoReferences
  let formats = options.svt_video_format.split(',');
  let videoReferences = data.videoReferences
    .filter((stream) => formats.includes(stream.format))
    .sort((a, b) => formats.indexOf(a.format) - formats.indexOf(b.format));

  if (videoReferences.length === 0) {
    // If the user messed up their settings then just try hls-cmaf-full
    formats = 'hls-cmaf-full'.split(',');
    videoReferences = data.videoReferences
      .filter((stream) => formats.includes(stream.format))
      .sort((a, b) => formats.indexOf(a.format) - formats.indexOf(b.format));

    if (videoReferences.length === 0) {
      // If there are still no videoReferences then just try to pick the first one...
      formats = [data.videoReferences[0].format];
      videoReferences = data.videoReferences
        .filter((stream) => formats.includes(stream.format))
        .sort((a, b) => formats.indexOf(a.format) - formats.indexOf(b.format));
    }
  }

  const streams = $('#streams');
  for (const stream of videoReferences) {
    let filenameTitle = title;
    if (options.add_source_id_to_filename && filenameTitle && data.svtId) {
      filenameTitle += ` [SVT ${data.svtId}]`;
    }
    let filename = filenameTitle ? `${filenameTitle}.${options.default_video_file_extension}` : extractFilename(stream.url);
    const option = document.createElement('option');
    option.value = stream.url;
    option.appendChild(document.createTextNode(title || extractFilename(stream.url)));
    option.setAttribute('data-filename', filename);
    streams.appendChild(option);

    if ($('#filename').value === '') {
      updateFilename(filename);
    }

    if (stream.url.endsWith('.m3u8') && fetchPlaylist) {
      processPlaylist(stream.url).catch(apiError);
    }
  }

  if (data.subtitleReferences) {
    subtitles.push(...data.subtitleReferences.map((s) => s.url));
    for (const sub of data.subtitleReferences) {
      const option = document.createElement('option');
      option.value = sub.url;
      option.appendChild(document.createTextNode(extractFilename(sub.url)));
      streams.appendChild(option);
    }
  }

  updateCommand();
}

export default [
  {
    re: /^https?:\/\/(?:www\.)?svtplay\.se\.?\/kanaler(?:\/([^\/?]+)|\?selectedChannel=([^\/?]+))/,
    func: (ret) => {
      let ch = ret[1] || ret[2];
      if (ch === 'svtbarn') {
        ch = 'barnkanalen';
      }
      const dataUrl = `https://api.svt.se/video/ch-${ch}`;
      fetchJson(dataUrl, {
        headers: {
          accept: 'application/json',
        },
      })
        .then(callback)
        .catch(apiError);
    },
  },
  {
    re: /^https?:\/\/(?:www\.)?svtplay\.se\.?\/(?:video|klipp)\/([a-zA-Z0-9]+)\/?/,
    func: (ret) => {
      console.log(ret);
      const videoId = ret[1];
      const dataUrl = `https://api.svt.se/video/${videoId}`;
      console.log(dataUrl);

      fetchJson(dataUrl, {
        headers: {
          accept: 'application/json',
        },
      })
        .then(callback)
        .catch(apiError);
    },
  },
  {
    re: /^https?:\/\/(?:www\.)?svt\.se\.?\/videoplayer-embed\/([^/?]+)/,
    func: (ret) => {
      // https://www.svt.se/videoplayer-embed/jXApWXa
      const videoId = ret[1];
      const dataUrl = `https://api.svt.se/video/${videoId}`;
      console.log(dataUrl);

      fetchJson(dataUrl, {
        headers: {
          accept: 'application/json',
        },
      })
        .then(callback)
        .catch(apiError);
    },
  },
  {
    re: /^https?:\/\/recept\.svt\.se\.?\//,
    func: async (_, url) => {
      const data = await fetchPageData(url);
      const videoIds = Object.values(data.props.pageProps.__APOLLO_STATE__)
        .map((v) => v.videoId)
        .filter(Boolean);

      for (const videoId of videoIds) {
        const dataUrl = `https://api.svt.se/video/${videoId}`;
        console.log(dataUrl);

        fetchJson(dataUrl, {
          headers: {
            accept: 'application/json',
          },
        })
          .then(callback)
          .catch(apiError);
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
        const dataUrl = `https://api.svt.se/video/${ret[2]}`;
        console.log(dataUrl);
        fetchJson(dataUrl, {
          headers: {
            accept: 'application/json',
          },
        })
          .then(callback)
          .catch(apiError);
        return;
      }

      // This is a brute force way of finding all the video ids on the page, but compared to trying to parse the site data it should be less prone to breaking when they update the website
      const videoIds = [];
      const searchRegEx = /\\?"svtId\\?"\s*:\s*\\?"([^\\"]+)\\?"/g;
      const doc = await fetchDOM(url);
      const scripts = doc.getElementsByTagName('script');
      for (const script of scripts) {
        let result;
        while ((result = searchRegEx.exec(script.textContent)) !== null) {
          videoIds.push(result[1]);
        }
      }
      console.log('videoIds', videoIds);

      if (videoIds.length === 0) {
        info('Hittade ingen video.');
        return;
      }

      // TODO: Could use Promise.all() to do this faster, but I have received "Access Denied" errors and I think maybe it happens when I make too many requests too fast???
      const fetchPlaylist = (videoIds.length === 1);
      for (const svtId of videoIds) {
        const dataUrl = `https://api.svt.se/video/${svtId}`;
        console.log(dataUrl);
        const data = await fetchJson(dataUrl);
        callback(data, fetchPlaylist);
      }
    },
  },
];
