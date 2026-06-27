// New stream URLs serve a URL that redirects (and thus do not have a file extension):
// https://www.sverigesradio.se/avsnitt/del-10-av-10-dockradio-med-birgitta-kjell-gloria-co
// Older page:
// https://www.sverigesradio.se/artikel/6411195
// Page with multiple streams:
// https://www.sverigesradio.se/artikel/6412615
// Live:
// https://www.sverigesradio.se/tabla.aspx?programid=132
//
// Metadata URL: (no longer used)
// https://www.sverigesradio.se/playerajax/getaudiourl?id=1749537&type=episode&quality=high&format=iis
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
  fetchNextData
} from '../utils.js';

function callback(stream) {
  const dropdown = $('#streams');
  const extension = extractExtension(stream.audioUrl) || 'mp3';
  const option = document.createElement('option');
  option.appendChild(document.createTextNode(stream.title));
  dropdown.appendChild(option);
  option.value = stream.audioUrl;
  option.setAttribute('data-force-download', 'true');
  let filename = stream.title;
  if (stream.id && options.add_source_id_to_filename) {
    filename += ` [SR ${stream.id}]`;
  }
  filename += `.${extension}`;
  option.setAttribute('data-filename', filename);
  updateCommand();
}

export default [
  {
    re: [/^https?:\/\/(?:www\.)?sverigesradio\.se\.?(\/.*)/],
    func: async (_, url) => {
      const streams = [];
      const data = await fetchNextData(url);
      for (const componentData of data) {
        const text = componentData[1];
        const idString = /"id":(\d+)/.exec(text)?.at(1);
        if (!idString) {
          continue;
        }
        const id = parseInt(idString, 10);
        if (id == 0) {
          console.log(text);
        }
        const title = /"title":"([^"]+)"/.exec(text)?.at(1)?.trim();

        const qualitiesRegEx = /"([^"]+)":{"url":"(https:\/\/[^"]+)"/g;
        const qualities = {};
        let urlResult;
        while ((urlResult = qualitiesRegEx.exec(text)) !== null) {
          const quality = urlResult[1];
          const audioUrl = urlResult[2];
          qualities[quality] = audioUrl;
        }
        const audioUrl = qualities['high'] || qualities['standard'] || qualities['low'] || Object.values(qualities)[0];
        if (title && audioUrl) {
          streams.push({ id, title, audioUrl });
          callback({ id, title, audioUrl });
        }
      }
      console.log(streams);

      if (streams.length === 0) {
        info('Hittade ingenting. Försök från en artikel.');
      }
    },
  },
];
