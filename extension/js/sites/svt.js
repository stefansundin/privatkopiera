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
// https://www.svt.se/recept/julvort
// https://api.svt.se/video/1398771-001A
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
  options,
  processPlaylist,
  subtitles,
  update_cmd,
  update_filename,
} from '../popup.js';
import { $, extract_filename, fetchJson, fetchNextData } from '../utils.js';

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
      processPlaylist(stream.url, data.contentDuration).catch(api_error);
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
      fetchJson(data_url, {
        headers: {
          accept: 'application/json',
        },
      })
        .then(svt_callback)
        .catch(api_error);
    },
  },
  {
    re: /^https?:\/\/(?:www\.)?svtplay\.se\.?\/(?:video|klipp)\/([a-zA-Z0-9]+)\//,
    func: (ret) => {
      console.log(ret);
      const videoId = ret[1];
      const data_url = `https://api.svt.se/video/${videoId}`;
      update_filename(`${videoId}.${options.default_video_file_extension}`);
      console.log(data_url);

      fetchJson(data_url, {
        headers: {
          accept: 'application/json',
        },
      })
        .then(svt_callback)
        .catch(api_error);
    },
  },
  {
    re: /^https?:\/\/(?:www\.)?svt\.se\.?\/videoplayer-embed\/([^/?]+)/,
    func: (ret) => {
      // https://www.svt.se/videoplayer-embed/jXApWXa
      const video_id = ret[1];
      const data_url = `https://api.svt.se/video/${video_id}`;
      update_filename(`${video_id}.mp4`);
      console.log(data_url);

      fetchJson(data_url, {
        headers: {
          accept: 'application/json',
        },
      })
        .then(svt_callback)
        .catch(api_error);
    },
  },
  {
    re: /^https?:\/\/(?:www\.)?svt\.se\.?\/recept\//,
    func: async (ret, url) => {
      const data = await fetchNextData(url);
      const videoIds = Object.values(data.props.pageProps.__APOLLO_STATE__)
        .map((v) => v.videoId)
        .filter(Boolean);

      for (const videoId of videoIds) {
        const data_url = `https://api.svt.se/video/${videoId}`;
        update_filename(`${videoId}.${options.default_video_file_extension}`);
        console.log(data_url);

        fetchJson(data_url, {
          headers: {
            accept: 'application/json',
          },
        })
          .then(svt_callback)
          .catch(api_error);
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
        console.log(data_url);
        fetchJson(data_url, {
          headers: {
            accept: 'application/json',
          },
        })
          .then(svt_callback)
          .catch(api_error);
        return;
      }

      // WARNING: This can probably break at any time..
      // TODO: Figure out actual query instead of the persistedQuery and remove hard coded stuff
      const variables = {
        allocationsCacheKey: '{}',
        direktcenterLinkedPostId: null,
        path: url.pathname,
        searchTerm: null,
        version: '0dd165ab',
      };
      const data = await fetchJson(
        `https://api.svt.se/newsqlear/graphql?operationName=RootQuery&variables=${encodeURI(
          JSON.stringify(variables),
        )}&extensions=%7B%22persistedQuery%22%3A%7B%22sha256Hash%22%3A%222841cd56db9c6ef22166c80c4269ebbb1fc8de24044c100e5581d3b8956e324e%22%2C%22version%22%3A1%7D%7D`,
        {
          headers: {
            accept:
              'application/graphql-response+json, application/graphql+json, application/json, text/event-stream, multipart/mixed',
          },
        },
      );
      console.log(data);

      const videoIds = [data?.data?.page?.topMedia?.svtId].filter(Boolean);
      console.log('videoIds', videoIds);

      for (const svtId of videoIds) {
        const data_url = `https://api.svt.se/video/${svtId}`;
        update_filename(`${svtId}.${options.default_video_file_extension}`);
        console.log(data_url);
        fetchJson(data_url).then(svt_callback).catch(api_error);
      }

      if (videoIds.length === 0) {
        info('Hittade ingen video.');
      }
    },
  },
];
