// https://www.dr.dk/drtv/se/hjernemassage-med-jan-hellesoee_-dagens-gaest-er-thomas-eje_242600
// https://production.dr-massive.com/api/account/items/242600/videos?delivery=stream&device=web_browser&ff=idp%2Cldp%2Crpt&lang=da&resolution=HD-1080&sub=Anonymous

import {
  options,
  subtitles,
  update_cmd,
  update_filename,
} from '../popup.js';
import { $, extract_filename, fetchJson, tab } from '../utils.js';

function dr_dk_callback(streams) {
  const dropdown = $('#streams');

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
        option.appendChild(document.createTextNode(extract_filename(sub.link)));
        dropdown.appendChild(option);
      }
    }
  }

  update_cmd();
}

export default [
  {
    re: /^https?:\/\/(?:www\.)?dr\.dk\.?\/.*_(\d+)/,
    func: async (ret) => {
      const video_id = ret[1];
      console.log('video_id', video_id);

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

      const data_url = `https://production.dr-massive.com/api/account/items/${video_id}/videos?delivery=stream&device=web_browser&ff=idp%2Cldp%2Crpt&lang=da&resolution=HD-1080&sub=Anonymous`;
      console.log(data_url);
      if (options.add_source_id_to_filename) {
        title += ` [DR ${video_id}]`;
      }
      update_filename(`${title}.${options.default_video_file_extension}`);

      const streams = await fetchJson(data_url, {
        headers: {
          accept: 'application/json',
          'x-authorization': `Bearer ${token}`,
        },
      });
      await dr_dk_callback(streams);
    },
  },
];
