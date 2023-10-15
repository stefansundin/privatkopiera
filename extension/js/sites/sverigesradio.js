// In Chrome, activeTab permissions automatically grants access to https://sverigesradio.se/, but this is not true for Firefox.
//
// Example URL:
// https://sverigesradio.se/artikel/6411195
// Example URL with multiple streams:
// https://sverigesradio.se/artikel/6412615
// Metadata URL:
// https://sverigesradio.se/sida/playerajax/AudioMetadata?id=5678841&type=clip
// Get audio URL:
// https://sverigesradio.se/sida/playerajax/getaudiourl?id=5678841&type=clip&quality=high&format=iis

import { api_error, tab_id, update_cmd, update_json_url } from '../popup.js';
import { $, extract_extension, get_json, isFirefox } from '../utils.js';

function sr_callback(stream, option) {
  return function (data) {
    const ext = extract_extension(data.audioUrl) || 'mp3';
    option.value = data.audioUrl;
    option.setAttribute('data-filename', `${stream.title}.${ext}`);
    update_cmd();
  };
}

export default [
  {
    re: /^https?:\/\/(?:www\.)?sverigesradio\.se\.?(\/.*)/,
    permissions: isFirefox
      ? {
          permissions: ['downloads'],
          origins: ['https://sverigesradio.se/'],
        }
      : null,
    func: async () => {
      // Find audio streams by looking for data-audio-id attributes
      const injectionResult = await chrome.scripting.executeScript({
        target: { tabId: tab_id },
        func: () => {
          const ids = [];
          const streams = [];
          const related = document
            .getElementsByTagName('article')[0]
            .querySelectorAll('[data-audio-id]');
          for (let i = 0; i < related.length; i++) {
            const link = related[i];
            const id = link.getAttribute('data-audio-id');
            if (ids.includes(id)) {
              continue;
            }
            ids.push(id);
            let header = link;
            while (header.children.length < 2) {
              header = header.parentNode;
            }
            let title = document.title;
            const title_element =
              header.getElementsByClassName('main-audio-new__title')[0] ||
              header.getElementsByClassName('related-audio__title')[0] ||
              header.getElementsByClassName(
                'article-audio-details__header-title',
              )[0];
            if (title_element) {
              title = title_element.textContent.trim();
            } else {
              const dash = title.lastIndexOf('-');
              if (dash !== -1) {
                title = title.substring(0, dash).trim();
              }
            }
            streams.push({
              id: id,
              type: link.getAttribute('data-audio-type'),
              title: title,
            });
          }
          return streams;
        },
      });
      console.log('injectionResult', injectionResult);
      const tabResult = injectionResult[0].result;

      const dropdown = $('#streams');
      for (const stream of tabResult) {
        // Create the option here so we always get them in the same order
        const option = document.createElement('option');
        option.appendChild(document.createTextNode(stream.title));
        dropdown.appendChild(option);

        const data_url = `https://sverigesradio.se/playerajax/getaudiourl?id=${stream.id}&type=${stream.type}&quality=high&format=iis`;
        update_json_url(data_url);

        console.log(data_url);
        fetch(data_url)
          .then(get_json)
          .then(sr_callback(stream, option))
          .catch(api_error);
      }
    },
  },
];
