// https://www.dr.dk/drtv/se/hjernemassage-med-jan-hellesoee_-dagens-gaest-er-thomas-eje_242600
// https://isl.dr-massive.com/api/account/items/242600/videos?delivery=stream&device=web_browser&ff=idp%2Cldp%2Crpt&lang=da&resolution=HD-1080&sub=Anonymous

import {
  api_error,
  options,
  subtitles,
  update_cmd,
  update_filename,
} from '../popup.js';
import { $, extract_filename, get_json } from '../utils.js';

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
    permissions: {
      origins: ['https://isl.dr-massive.com/'],
    },
    func: (ret) => {
      const video_id = ret[1];
      console.log(video_id);

      // Grab the page title and the required token from the page's localStorage
      chrome.tabs.executeScript(
        {
          code: `(function(){
            return [document.title, localStorage["session.tokens"]];
          })()`,
        },
        function (data) {
          console.log(data);
          const title = data[0][0].split('|')[0].trim();
          const tokens = JSON.parse(data[0][1]);
          console.log(tokens);
          const token = tokens[0].value;

          const data_url = `https://isl.dr-massive.com/api/account/items/${video_id}/videos?delivery=stream&device=web_browser&ff=idp%2Cldp%2Crpt&lang=da&resolution=HD-1080&sub=Anonymous`;
          update_filename(`${title}.${options.default_video_file_extension}`);

          console.log(data_url);
          fetch(data_url, {
            headers: {
              'x-authorization': `Bearer ${token}`,
            },
          })
            .then(get_json)
            .then(dr_dk_callback)
            .catch(api_error);
        },
      );
    },
  },
];
