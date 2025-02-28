// https://www.dr.dk/drtv/se/hjernemassage-med-jan-hellesoee_-dagens-gaest-er-thomas-eje_242600
// https://production.dr-massive.com/api/account/items/242600/videos?delivery=stream&device=web_browser&ff=idp%2Cldp%2Crpt&lang=da&resolution=HD-1080&sub=Anonymous

import {
  options,
  subtitles,
  updateCommand,
  updateFilename,
} from '../popup.js';
import {
  $,
  extractFilename,
  fetchJson,
  tab,
} from '../utils.js';

function callback(streams) {
  const dropdown = $('#streams');
  const subtitleDropdown = $('#subtitles');

  for (const stream of streams) {
    const option = document.createElement('option');
    option.value = stream.url;
    option.appendChild(
      document.createTextNode(`${stream.accessService} (${stream.resolution})`),
    );
    dropdown.appendChild(option);
  }

  for (const stream of streams) {
    if (stream.subtitles) {
      subtitles.push(...stream.subtitles.map((sub) => sub.link));
      for (const sub of stream.subtitles) {
        const option = document.createElement('option');
        option.value = sub.link;
        option.appendChild(document.createTextNode(extractFilename(sub.label ?? sub.language)));
        subtitleDropdown.appendChild(option);
      }
    }
  }

  updateCommand();
}

export default [
  {
    re: /^https?:\/\/(?:www\.)?dr\.dk\.?\/.*_(\d+)/,
    func: async (ret) => {
      const videoId = ret[1];
      console.log('videoId', videoId);

      // Grab the page title and the required token from the page's localStorage
      const injectionResult = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => [document.title, localStorage['session.tokens']],
      });
      console.debug('injectionResult', injectionResult);
      if (injectionResult[0].error) {
        throw injectionResult[0].error;
      } else if (injectionResult[0].result === null) {
        throw new Error('Script error.');
      }
      const tabResult = injectionResult[0].result;
      let title = tabResult[0].split('|')[0].trim();
      const tokens = JSON.parse(tabResult[1]);
      console.log('tokens', tokens);
      const token = tokens.find((t) => t.type === 'UserAccount').value;

      const dataUrl = `https://production.dr-massive.com/api/account/items/${videoId}/videos?delivery=stream&device=web_browser&ff=idp%2Cldp%2Crpt&lang=da&resolution=HD-1080&sub=Anonymous`;
      console.log(dataUrl);
      if (options.add_source_id_to_filename) {
        title += ` [DR ${videoId}]`;
      }
      updateFilename(`${title}.${options.default_video_file_extension}`);

      const streams = await fetchJson(dataUrl, {
        headers: {
          accept: 'application/json',
          'x-authorization': `Bearer ${token}`,
        },
      });
      callback(streams);
    },
  },
];
