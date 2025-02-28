import defaultOptions from './defaultOptions.js';
import dr from './sites/dr.dk.js';
import nrk from './sites/nrk.js';
import sverigesradio from './sites/sverigesradio.js';
import svt from './sites/svt.js';
import tv4 from './sites/tv4.js';
import ur from './sites/ur.js';
import {
  $,
  extractExtension,
  extractFilename,
  fetchText,
  getTab,
  isAndroid,
  isFirefox,
  tab,
  toObject,
} from './utils.js';

const matchers = [...svt, ...ur, ...sverigesradio, ...nrk, ...dr, ...tv4];

export const options = {
  default_video_file_extension: localStorage.default_video_file_extension || defaultOptions.default_video_file_extension,
  default_audio_file_extension: localStorage.default_audio_file_extension || defaultOptions.default_audio_file_extension,
  svt_video_format: localStorage.svt_video_format?.split(',') || defaultOptions.svt_video_format,
  add_source_id_to_filename: localStorage.add_source_id_to_filename ? localStorage.add_source_id_to_filename === 'true' : defaultOptions.add_source_id_to_filename,
  ffmpeg_command: localStorage.ffmpeg_command || defaultOptions.ffmpeg_command,
  output_path: localStorage.output_path || defaultOptions.output_path,
};

export const subtitles = [];
let url, site;
let initialFilenameSet = false;

export function updateFilename(filename) {
  // replace illegal characters
  $('#filename').value = filename
    .replace(/[/\\:]/g, '-')
    .replace(/["”´‘’]/g, "'")
    .replace(/[*?<>|!]/g, '')
    .replace(/[\u00a0 ]+/g, ' ') // non-breaking space
    .replace(/\t+/g, ' ');
}

export function info(text) {
  const el = $('#info');
  el.textContent = text;
}

export function apiError(e) {
  console.error(e);
  const el = $('#info');
  while (el.hasChildNodes()) {
    el.removeChild(el.firstChild);
  }
  if (e instanceof Response) {
    el.appendChild(document.createTextNode('Fel: '));
    let a = document.createElement('a');
    a.target = '_blank';
    a.href = e.url;
    a.appendChild(document.createTextNode('API'));
    el.appendChild(a);
    el.appendChild(document.createTextNode(` svarade med kod `));
    a = document.createElement('a');
    a.target = '_blank';
    a.href = `https://httpstatuses.com/${e.status}`;
    a.appendChild(document.createTextNode(e.status));
    el.appendChild(a);
    el.appendChild(document.createTextNode('.'));
  } else {
    el.appendChild(document.createTextNode(`Error: ${e.message}`));
  }
}

function download_info(program) {
  const el = $('#info');
  if (!program) {
    el.style.visibility = 'hidden';
    return;
  }
  el.textContent = 'För att ladda ned den här strömmen krävs ';
  const a = document.createElement('a');
  a.target = '_blank';
  a.href = `https://stefansundin.github.io/privatkopiera/#${program.toLowerCase()}`;
  if (isFirefox) {
    a.addEventListener('click', () => {
      setTimeout(window.close, 10);
    });
  }
  a.appendChild(document.createTextNode(program));
  el.appendChild(a);
  el.appendChild(document.createTextNode(`.`));
}

export function updateCommand(e) {
  const filename = $('#filename');
  const streams = $('#streams');
  const selectSubtitles = $("#subtitles")
  const stream = streams.selectedOptions[0];
  if (!stream) {
    info('Hittade ingen video. Har programmet sänts än?');
    return;
  }
  const audio_stream = stream.getAttribute('data-audio-stream');

  if (
    (e && e.target === streams) ||
    (filename.value === '' && !initialFilenameSet)
  ) {
    initialFilenameSet = true;
    const filename = stream.getAttribute('data-filename');
    if (filename) {
      updateFilename(filename);
    }
  }

  const cmd = $('#cmd');
  const url = streams.value;
  const selectedSubs = selectSubtitles ? subtitles : selectSubtitles.selectedOptions.map(item => item.value);

  if (isAndroid) {
    cmd.value = url;
    info('');
    $('#info_android').classList.remove('d-none');
    cmd.dispatchEvent(new Event('input'));
    return;
  }

  let output_path = options.output_path + filename.value;
  const extension = extractExtension(filename.value);
  const streamFilename = extractFilename(url);
  const streamExtension = extractExtension(url);
  streams.title = streamFilename;
  if (streamExtension === 'f4m') {
    cmd.value = `php AdobeHDS.php --delete --manifest "${url}" --outfile "${output_path}"`;
  } else if (streamExtension === 'm4a' || streamExtension === 'mp3') {
    cmd.value = url;
    $('#copy').classList.add('d-none');
    $('#download').classList.remove('d-none');
    const label = $("label[for='cmd']")[0];
    label.textContent = 'URL';
  } else if (streamFilename.endsWith('_a.m3u8') || extension === 'mka' || extension === 'aac') {
    if (extension === 'mkv') {
      output_path = output_path.replace(/\.mkv$/, '.mka');
    } else if (extension === 'mp4') {
      output_path = output_path.replace(/\.mp4$/, '.m4a');
    }
    cmd.value = `${options.ffmpeg_command} -i "${audio_stream || url}" -vn -c:a copy "${output_path}"`;
  } else if (extension === 'm4a') {
    cmd.value = `${options.ffmpeg_command} -i "${audio_stream || url}" -vn -c:a copy -bsf:a aac_adtstoasc "${output_path}"`;
  } else if (extension === 'mp3' || extension === 'ogg') {
    cmd.value = `${options.ffmpeg_command} -i "${audio_stream || url}" -vn "${output_path}"`;
  } else if (streamExtension === 'vtt') {
    if (extension === 'mkv' || extension === 'mp4') {
      output_path = output_path.replace(/\.(mkv|mp4)$/, '.srt');
    } else if (extension !== 'srt') {
      output_path += '.srt';
    }
    cmd.value = `${options.ffmpeg_command} -i "${url}" "${output_path}"`;
  } else if (
    selectedSubs.length > 0 &&
    (extension === 'srt' || extension === 'vtt' || url === selectedSubs[0])
  ) {
    if (extension === 'mkv') {
      output_path = output_path.replace(/\.mkv$/, '.srt');
    }
    cmd.value = `${options.ffmpeg_command} -i "${selectedSubs[0]}" "${output_path}"`;
  } else {
    const inputs = [url];
    if (audio_stream) {
      inputs.push(audio_stream);
    }
    inputs.push(...selectedSubs);

    const command = [
      options.ffmpeg_command,
      ...inputs.map((url) => `-i "${url}"`),
    ];
    if (selectedSubs.length > 1) {
      // Adding -map arguments to ffmpeg makes it select all the streams from that input. https://trac.ffmpeg.org/wiki/Map
      command.push(...inputs.map((v, i) => `-map ${i}`));
    }
    command.push('-c:v copy -c:a copy');
    if (extension === 'mp4') {
      command.push('-c:s mov_text -bsf:a aac_adtstoasc');
    }
    command.push(`"${output_path}"`);

    cmd.value = command.join(' ');
  }
  cmd.setAttribute('data-url', url);
  cmd.dispatchEvent(new Event('input'));

  if (cmd.value.startsWith('ffmpeg')) {
    download_info('FFmpeg');
  } else if (cmd.value.startsWith('php AdobeHDS.php')) {
    download_info('AdobeHDS');
  } else {
    download_info();
  }
}

export async function processPlaylist(url) {
  if (isAndroid) {
    return;
  }

  const baseUrl = url.replace(/\/[^/]+$/, '/');
  const text = await fetchText(url);
  console.debug(text);

  const ext_x_media = {};
  const streams = [];
  let params;
  for (const line of text.split('\n')) {
    if (line.length === 0) {
      continue;
    }
    console.debug(line);
    if (line.startsWith('#')) {
      if (!line.includes(':')) {
        continue;
      }
      const type = line.substring(1, line.indexOf(':'));
      const args = line
        .substring(line.indexOf(':') + 1)
        .match(/[A-Z\-]+=(?:"[^"]*"|[^,]*)/g);
      if (!args) {
        continue;
      }
      const obj = toObject(args.map((arg) => {
        const k = arg.substring(0, arg.indexOf('='));
        let v = arg.substring(arg.indexOf('=') + 1);
        if (v.startsWith('"') && v.endsWith('"')) {
          v = v.substring(1, v.length - 1);
        }
        return [k, v];
      }));
      console.debug(obj);
      if (type === 'EXT-X-MEDIA') {
        // This probably needs to be rewritten...
        if (obj['TYPE'] === 'AUDIO') {
          if (obj['DEFAULT'] === 'YES' && obj['GROUP-ID']) {
            if (!ext_x_media[obj['TYPE']]) {
              ext_x_media[obj['TYPE']] = {};
            }
            ext_x_media[obj['TYPE']][obj['GROUP-ID']] = obj;
          }
        } else {
          ext_x_media[obj['TYPE']] = obj;
        }
      } else if (type === 'EXT-X-STREAM-INF') {
        params = obj;
      }
    } else {
      let url = line;
      if (!/^https?:\/\//.test(url)) {
        url = baseUrl + url;
      }
      streams.push({
        bitrate: parseInt(params['BANDWIDTH'], 10),
        params: params,
        url: url,
      });
    }
  }
  console.debug(streams);

  const dropdown = $('#streams');
  const default_option = dropdown.getElementsByTagName('option')[0];

  for (const stream of streams.sort((a, b) => b.bitrate - a.bitrate)) {
    const kbps = Math.round(stream.bitrate / 1000);
    const option = document.createElement('option');
    option.value = stream.url;
    const label = [];
    if (stream.params['RESOLUTION']) {
      label.push(stream.params['RESOLUTION']);
    }
    label.push(`${kbps} kbps`);
    if (stream.params['AUDIO']) {
      label.push(stream.params['AUDIO']);
    }
    let text = label.shift();
    if (label.length > 0) {
      text += ` (${label.join(', ')})`;
    }
    option.appendChild(document.createTextNode(text));
    if (ext_x_media['AUDIO'] && stream.params['AUDIO']) {
      const audio = ext_x_media['AUDIO'][stream.params['AUDIO']];
      option.setAttribute('data-audio-stream', baseUrl + audio['URI']);
    }
    dropdown.insertBefore(option, default_option);
  }
  if (ext_x_media['AUDIO']) {
    for (const [group, audio] of Object.entries(ext_x_media['AUDIO'])) {
      const option = document.createElement('option');
      option.value = baseUrl + audio['URI'];
      option.appendChild(
        document.createTextNode(`AUDIO: ${audio['NAME']} (${group})`),
      );
      dropdown.insertBefore(option, default_option);
    }
  }
  dropdown.getElementsByTagName('option')[0].selected = true;
  updateCommand();
}

async function call_func() {
  info('Laddar, var god vänta...');
  const ret = site.re.exec(tab.url);
  if (ret) {
    try {
      await site.func(ret, url);
    } catch (err) {
      info(`Error: ${err.message}`);
      throw err;
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  $('#extension_version').textContent = `v${chrome.runtime.getManifest().version}`;

  if (isAndroid) {
    document.body.classList.add('mobile');
    $('#expand').classList.add('d-none');
    $('#url').parentElement.classList.add('d-none');
    $('#filename').parentElement.classList.add('d-none');
    $('#open_options').classList.add('d-none');
    $('#copy').textContent = 'Kopiera URL';
    const label = $("label[for='cmd']")[0];
    label.textContent = 'URL';
  } else {
    $('#expand').addEventListener('click', () => {
      document.body.classList.toggle('expand');
      const expanded = document.body.classList.contains('expand');
      $('#expand').textContent = expanded ? '»' : '«';
      localStorage.setItem('expanded', expanded.toString());
    });

    const expanded = localStorage.getItem('expanded') === 'true';
    if (expanded) {
      $('#expand').click();
    }
  }

  $('#cmd').addEventListener('input', (e) => {
    $('#copy').disabled = e.target.value.length === 0;
    if (!isAndroid) {
      $('#copy').textContent = 'Kopiera kommando';
    }
  });

  $('#copy').addEventListener('click', (e) => {
    const cmd = $('#cmd');
    if (e.shiftKey) {
      // copy only the URL if the shift key is held
      cmd.value = cmd.getAttribute('data-url');
    }
    navigator.clipboard.writeText(cmd.value);
    $('#copy').textContent = 'Kopierat!';
  });

  $('#open_options').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  $('#grant_permissions').addEventListener('click', async () => {
    const granted = await chrome.permissions.request(site.permissions);
    // The popup is automatically closed, so this does not really matter
    // It stays open if "Inspect Popup" is used
    if (granted) {
      $('#copy').classList.remove('d-none');
      $('#grant_permissions').classList.add('d-none');
      $('#streams').disabled = false;
      $('#filename').disabled = false;
      $('#cmd').disabled = false;
      call_func();
    } else {
      info('Fel: Behörigheter ej beviljade.');
    }
  });

  $('#download').addEventListener('click', async () => {
    const granted = await chrome.permissions.request({
      permissions: ['downloads'],
    });
    if (!granted) {
      return;
    }
    try {
      $('#download').disabled = true;
      await chrome.downloads.download({
        url: $('#cmd').value,
        filename: $('#filename').value,
      });
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes('filename must not contain illegal characters')
      ) {
        // try again without specifying a filename
        await chrome.downloads.download({
          url: $('#cmd').value,
        });
      }
    } finally {
      $('#download').disabled = false;
    }
  });

  const cmd = $('#cmd');
  if (isAndroid) {
    cmd.style.height = '120px';
  } else {
    const cmdHeight = localStorage.getItem('cmd-height');
    if (cmdHeight !== undefined) {
      cmd.style.height = cmdHeight;
    }
    new ResizeObserver((entries) => {
      for (const entry of entries) {
        localStorage.setItem('cmd-height', entry.target.style.height);
      }
    }).observe(cmd);
  }

  $('#streams').addEventListener('input', updateCommand);
  $('#filename').addEventListener('input', updateCommand);
  $('#subtitles').addEventListener('input', updateCommand);

  if (isFirefox && !isAndroid) {
    document
      .querySelectorAll('#open_options,a[href="https://stefansundin.github.io/privatkopiera/"]')
      .forEach((a) => {
        a.addEventListener('click', () => {
          setTimeout(window.close, 10);
        });
      });
  }

  await getTab();
  if (!tab.url) {
    // https://stackoverflow.com/questions/28786723/why-doesnt-chrome-tabs-query-return-the-tabs-url-when-called-using-requirejs
    // https://issues.chromium.org/issues/41160154
    // https://issues.chromium.org/issues/40648397
    info('Unable to get the tab URL. Try closing all devtools and open the popup without inspecting it.');
    return;
  }
  url = new URL(tab.url);
  $('#url').value = tab.url;
  console.log(tab.url);

  site = matchers.find((m) => m.re.test(tab.url));
  if (site) {
    if (site.permissions) {
      const granted = await chrome.permissions.contains(site.permissions);
      if (granted) {
        call_func();
      } else {
        $('#copy').classList.add('d-none');
        $('#grant_permissions').classList.remove('d-none');
        $('#streams').disabled = true;
        $('#filename').disabled = true;
        $('#cmd').disabled = true;
        info('Fler behörigheter krävs för den här sidan.');
      }
      return;
    } else {
      call_func();
    }
  } else {
    info('Fel: Den här hemsidan stöds ej.');
  }
});
