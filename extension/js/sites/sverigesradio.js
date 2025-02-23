// Example URL:
// https://www.sverigesradio.se/artikel/6411195
// Example URL with multiple streams:
// https://www.sverigesradio.se/artikel/6412615
// Live:
// https://www.sverigesradio.se/tabla.aspx?programid=132
//
// Metadata URL:
// https://www.sverigesradio.se/sida/playerajax/AudioMetadata?id=5678841&type=clip
// Get audio URL:
// https://www.sverigesradio.se/sida/playerajax/getaudiourl?id=5678841&type=clip&quality=high&format=iis

import {
  info,
  options,
  updateCommand
} from '../popup.js';
import {
  $,
  extractExtension,
  fetchJson,
  tab
} from '../utils.js';

function callback(stream, data) {
  const dropdown = $('#streams');
  const extension = extractExtension(data.audioUrl) || 'mp3';
  const option = document.createElement('option');
  option.appendChild(document.createTextNode(stream.title));
  dropdown.appendChild(option);
  option.value = data.audioUrl;
  let filename = stream.title;
  if (options.add_source_id_to_filename) {
    filename += ` [SR ${stream.id}]`;
  }
  filename += `.${extension}`;
  option.setAttribute('data-filename', filename);
  updateCommand();
}

export default [
  {
    re: /^https?:\/\/(?:www\.)?sverigesradio\.se\.?(\/.*)/,
    func: async () => {
      // Find audio streams by looking for data-audio-id attributes
      const injectionResult = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          try {
            const ids = [];
            const streams = [];
            const related = document.getElementsByTagName('article')[0]?.querySelectorAll('[data-audio-id]') ?? [];
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
              const titleElement =
                header.getElementsByClassName('main-audio-new__title')[0] ||
                header.getElementsByClassName('related-audio__title')[0] ||
                header.getElementsByClassName('article-audio-details__header-title')[0];
              if (titleElement) {
                title = titleElement.textContent.trim();
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
            return { result: streams };
          } catch (err) {
            return { error: err.message };
          }
        },
      });
      console.debug('injectionResult', injectionResult);
      if (injectionResult[0].error) {
        throw injectionResult[0].error;
      } else if (injectionResult[0].result === null) {
        throw new Error('Script error.');
      } else if (injectionResult[0].result.error) {
        throw new Error(injectionResult[0].result.error);
      }
      const streams = injectionResult[0].result.result;

      for (const stream of streams) {
        const dataUrl = `/playerajax/getaudiourl?id=${stream.id}&type=${stream.type}&quality=high&format=iis`;
        const data = await fetchJson(dataUrl, {
          headers: {
            accept: 'application/json',
          },
        });
        callback(stream, data);
      }

      if (streams.length === 0) {
        info('Hittade ingenting. Försök från en artikel.');
      }
    },
  },
];
