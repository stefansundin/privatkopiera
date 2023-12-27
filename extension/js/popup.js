import default_options from './default_options.js';
import dr from './sites/dr.dk.js';
import nrk from './sites/nrk.js';
import sverigesradio from './sites/sverigesradio.js';
import svt from './sites/svt.js';
import tv4 from './sites/tv4.js';
import ur from './sites/ur.js';
import {
  $,
  extract_extension,
  extract_filename,
  fmt_filesize,
  isFirefox,
  toObject,
} from './utils.js';

const matchers = [...svt, ...ur, ...sverigesradio, ...nrk, ...dr, ...tv4];

export const options = {
  default_video_file_extension:
    localStorage.default_video_file_extension ||
    default_options.default_video_file_extension,
  default_audio_file_extension:
    localStorage.default_audio_file_extension ||
    default_options.default_audio_file_extension,
};

export const subtitles = [];
export let tab_id;
let tab_url, url, site;

export function update_filename(fn) {
  // replace illegal characters
  $('#filename').value = fn
    .replace(/[/\\:]/g, '-')
    .replace(/["”´‘’]/g, "'")
    .replace(/[*?<>|!]/g, '')
    .replace(/\t+/, ' ');
}

export function update_json_url(url) {
  $('#open_json').href = url;
  $('#open_json').classList.remove('d-none');
}

export function info(text) {
  const el = $('#info');
  while (el.hasChildNodes()) {
    el.removeChild(el.firstChild);
  }
  el.appendChild(document.createTextNode(text));
}

export function api_error(e) {
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
  while (el.hasChildNodes()) {
    el.removeChild(el.firstChild);
  }
  el.appendChild(
    document.createTextNode('För att ladda ned den här strömmen krävs '),
  );
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

export function update_cmd(e) {
  const filename = $('#filename');
  const streams = $('#streams');
  const stream = streams.selectedOptions[0];
  if (!stream) {
    info('Hittade ingen video. Har programmet sänts än?');
    return;
  }
  const audio_stream = stream.getAttribute('data-audio-stream');

  if ((e && e.target === streams) || filename.value === '') {
    const fn = stream.getAttribute('data-filename');
    if (fn) {
      update_filename(fn);
    }
  }

  const cmd = $('#cmd');
  const url = streams.value;
  let fn = filename.value;
  const ext = extract_extension(fn);
  const stream_fn = extract_filename(url);
  const stream_ext = extract_extension(url);
  streams.title = stream_fn;
  if (stream_ext === 'f4m') {
    cmd.value = `php AdobeHDS.php --delete --manifest "${url}" --outfile "${fn}"`;
  } else if (
    stream_ext === 'm4a' ||
    stream_ext === 'mp3' ||
    /^https?:\/\/http-live\.sr\.se/.test(url)
  ) {
    cmd.value = url;
    $('#copy').classList.add('d-none');
    $('#download').classList.remove('d-none');
    const label = $("label[for='cmd']")[0];
    while (label.hasChildNodes()) {
      label.removeChild(label.firstChild);
    }
    label.appendChild(document.createTextNode('URL'));
  } else if (stream_fn.endsWith('_a.m3u8') || ext === 'mka' || ext === 'aac') {
    if (ext === 'mkv') {
      fn = fn.replace('.mkv', '.mka');
    } else if (ext === 'mp4') {
      fn = fn.replace('.mp4', '.m4a');
    }
    cmd.value = `ffmpeg -i "${audio_stream || url}" -acodec copy "${fn}"`;
  } else if (ext === 'm4a') {
    cmd.value = `ffmpeg -i "${
      audio_stream || url
    }" -acodec copy -absf aac_adtstoasc "${fn}"`;
  } else if (ext === 'mp3' || ext === 'ogg') {
    cmd.value = `ffmpeg -i "${audio_stream || url}" "${fn}"`;
  } else if (stream_ext === 'vtt') {
    if (ext === 'mkv' || ext === 'mp4') {
      fn = fn.replace(/\.(mkv|mp4)$/, '.srt');
    } else if (ext !== 'srt') {
      fn += '.srt';
    }
    cmd.value = `ffmpeg -i "${url}" "${fn}"`;
  } else if (
    subtitles.length > 0 &&
    (ext === 'srt' || ext === 'vtt' || url === subtitles[0])
  ) {
    if (ext === 'mkv') {
      fn = fn.replace('.mkv', '.srt');
    }
    cmd.value = `ffmpeg -i "${subtitles[0]}" "${fn}"`;
  } else {
    const inputs = [url];
    if (audio_stream) {
      inputs.push(audio_stream);
    }
    inputs.push(...subtitles);
    if (ext === 'mp4') {
      cmd.value = `ffmpeg ${inputs
        .map((url) => `-i "${url}"`)
        .join(' ')} -vcodec copy -acodec copy -absf aac_adtstoasc "${fn}"`;
    } else {
      cmd.value = `ffmpeg ${inputs
        .map((url) => `-i "${url}"`)
        .join(' ')} -vcodec copy -acodec copy "${fn}"`;
    }
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

export function master_callback(length, base_url) {
  return function (text) {
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
        if (!line.includes(':')) continue;
        const type = line.substring(1, line.indexOf(':'));
        const args = line
          .substring(line.indexOf(':') + 1)
          .match(/[A-Z\-]+=(?:"[^"]*"|[^,]*)/g);
        if (!args) continue;
        const obj = toObject(
          args.map((arg) => {
            const k = arg.substring(0, arg.indexOf('='));
            let v = arg.substring(arg.indexOf('=') + 1);
            if (v.startsWith('"') && v.endsWith('"')) {
              v = v.substring(1, v.length - 1);
            }
            return [k, v];
          }),
        );
        console.debug(obj);
        if (type === 'EXT-X-MEDIA') {
          // && obj["TYPE"] === "AUDIO") {
          ext_x_media[obj['TYPE']] = obj;
        } else if (type === 'EXT-X-STREAM-INF') {
          params = obj;
        }
      } else {
        let url = line;
        if (!/^https?:\/\//.test(url)) {
          url = base_url + url;
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
      option.appendChild(document.createTextNode(`${kbps} kbps`));
      if (ext_x_media['AUDIO']) {
        option.setAttribute(
          'data-audio-stream',
          base_url + ext_x_media['AUDIO']['URI'],
        );
      }
      const extra = [];
      if (stream.params['RESOLUTION']) {
        extra.push(stream.params['RESOLUTION']);
      }
      if (length) {
        // the calculation is off by about 5%, probably because of audio and overhead
        extra.push(`~${fmt_filesize((1.05 * length * stream.bitrate) / 8)}`);
      }
      if (extra.length !== 0) {
        option.appendChild(document.createTextNode(` (${extra.join(', ')})`));
      }
      dropdown.insertBefore(option, default_option);
    }
    if (ext_x_media['AUDIO']) {
      const option = document.createElement('option');
      option.value = base_url + ext_x_media['AUDIO']['URI'];
      option.appendChild(
        document.createTextNode(extract_filename(ext_x_media['AUDIO']['URI'])),
      );
      dropdown.insertBefore(option, default_option);
    }
    dropdown.getElementsByTagName('option')[0].selected = true;
    update_cmd();
  };
}

async function call_func() {
  info('Laddar, var god vänta...');
  const ret = site.re.exec(tab_url);
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
  $('#extension_version').textContent = `v${
    chrome.runtime.getManifest().version
  }`;

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

  $('#cmd').addEventListener('input', (e) => {
    $('#copy').disabled = e.target.value.length === 0;
    $('#copy').textContent = 'Kopiera kommando';
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
    } finally {
      $('#download').disabled = false;
    }
  });

  const cmd = $('#cmd');
  const cmd_height = localStorage.getItem('cmd-height');
  if (cmd_height !== undefined) {
    cmd.style.height = cmd_height;
  }
  new ResizeObserver((entries) => {
    for (const entry of entries) {
      localStorage.setItem('cmd-height', entry.target.style.height);
    }
  }).observe(cmd);

  $('#streams').addEventListener('input', update_cmd);
  $('#filename').addEventListener('input', update_cmd);

  if (isFirefox) {
    document
      .querySelectorAll(
        '#open_json,#open_options,a[href="https://stefansundin.github.io/privatkopiera/"]',
      )
      .forEach((a) => {
        a.addEventListener('click', () => {
          setTimeout(window.close, 10);
        });
      });
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tab_id = tab.id;
  tab_url = tab.url;

  if (!tab_url) {
    // https://stackoverflow.com/questions/28786723/why-doesnt-chrome-tabs-query-return-the-tabs-url-when-called-using-requirejs
    // https://bugs.chromium.org/p/chromium/issues/detail?id=462939
    // https://bugs.chromium.org/p/chromium/issues/detail?id=1005701
    info(
      'Unable to get the tab URL. Try closing all devtools and open the popup without inspecting it.',
    );
    return;
  }
  if (
    tab_url.startsWith(
      'chrome-extension://klbibkeccnjlkjkiokjodocebajanakg/suspended.html',
    )
  ) {
    // Tab suspended with The Great Suspender. Your mileage may vary.
    tab_url = tab_url.split('&uri=')[1];
  }
  url = new URL(tab_url);
  $('#url').value = tab_url;
  console.log(tab_url);

  site = matchers.find((m) => m.re.test(tab_url));
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
