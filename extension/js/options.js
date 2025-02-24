import defaultOptions from './defaultOptions.js';
import { isAndroid } from './utils.js';

const options = {
  default_video_file_extension: localStorage.default_video_file_extension || defaultOptions.default_video_file_extension,
  default_audio_file_extension: localStorage.default_audio_file_extension || defaultOptions.default_audio_file_extension,
  svt_video_format: localStorage.svt_video_format?.split(',') || defaultOptions.svt_video_format,
  add_source_id_to_filename: localStorage.add_source_id_to_filename ? localStorage.add_source_id_to_filename === 'true' : defaultOptions.add_source_id_to_filename,
  ffmpeg_command: localStorage.ffmpeg_command || defaultOptions.ffmpeg_command,
  output_path: localStorage.output_path || defaultOptions.output_path,
};

function applySuggestion() {
  const input = document.getElementById(this.dataset.suggestionFor);
  input.value = this.textContent.trim();
}

/**
 * Sort the input array and returns a new array without duplicates, preserving order and keeping the first item in case of duplicates.
 *
 * @param {Array} input
 * @returns {Array}
 */
function dedupe(input) {
  const result = [];
  for (const item of input) {
    if (!result.includes(item)) {
      result.push(item);
    }
  }
  return result;
}

document.addEventListener('DOMContentLoaded', async () => {
  const platformInfo = await chrome.runtime.getPlatformInfo();
  const pathSeparator = platformInfo.os === 'win' ? '\\' : '/';
  const exampleOutputPath =
    platformInfo.os === 'win'
      ? 'C:\\Användare\\Svensson\\Skrivbord\\'
      : platformInfo.os === 'mac'
        ? '/Users/Svensson/Downloads/'
        : '/home/svensson/Downloads/';

  const theme = localStorage.getItem('theme') ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-bs-theme', theme);

  document.getElementById('example_output_path').textContent = exampleOutputPath;

  const default_video_file_extension_input = document.getElementById('default_video_file_extension');
  const default_audio_file_extension_input = document.getElementById('default_audio_file_extension');
  const svt_video_format_input = document.getElementById('svt_video_format');
  const ffmpeg_command_input = document.getElementById('ffmpeg_command');
  const add_source_id_to_filename_input = document.getElementById('add_source_id_to_filename');
  const output_path_input = document.getElementById('output_path');
  const save_button = document.getElementById('save');

  default_video_file_extension_input.value = options.default_video_file_extension;
  default_audio_file_extension_input.value = options.default_audio_file_extension;
  svt_video_format_input.value = options.svt_video_format.join(',');
  add_source_id_to_filename_input.checked = options.add_source_id_to_filename;
  ffmpeg_command_input.value = options.ffmpeg_command;
  output_path_input.value = options.output_path;

  const suggestions = document.querySelectorAll('[data-suggestion-for]');
  for (const el of suggestions) {
    el.addEventListener('click', applySuggestion);
  }

  function validate(notify = false) {
    if (
      output_path_input.value.toLowerCase() === 'c:\\' ||
      output_path_input.value.toLowerCase().startsWith('c:\\windows\\')
    ) {
      if (notify) {
        alert('Sökvägen som du har valt rekommenderas ej då vanliga användare normalt inte kan skapa filer där. Välj en sökväg som din användare kan skriva till.');
      }
      output_path_input.classList.add('text-danger');
    } else {
      output_path_input.classList.remove('text-danger');
    }
  }
  validate();

  save_button.addEventListener('click', () => {
    localStorage.default_video_file_extension = default_video_file_extension_input.value.trim();
    localStorage.default_audio_file_extension = default_audio_file_extension_input.value.trim();
    localStorage.add_source_id_to_filename = add_source_id_to_filename_input.checked;
    localStorage.svt_video_format = dedupe(svt_video_format_input.value.split(',').map(format => format.trim())).join(',');
    localStorage.ffmpeg_command = ffmpeg_command_input.value;

    if (output_path_input.value !== '' && !output_path_input.value.endsWith(pathSeparator)) {
      output_path_input.value += pathSeparator;
    }
    localStorage.output_path = output_path_input.value;

    save_button.textContent = 'Sparat!';
    setTimeout(() => {
      save_button.textContent = 'Spara inställningar';
    }, 3000);

    validate(true);
  });

  for (const input of document.querySelectorAll("input[type='text']")) {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        save_button.focus();
        save_button.click();
      }
    });
  }

  document.getElementById('reset').addEventListener('click', () => {
    delete localStorage.default_video_file_extension;
    delete localStorage.default_audio_file_extension;
    delete localStorage.svt_video_format;
    delete localStorage.add_source_id_to_filename;
    delete localStorage.ffmpeg_command;
    delete localStorage.output_path;

    default_video_file_extension_input.value = defaultOptions.default_video_file_extension;
    default_audio_file_extension_input.value = defaultOptions.default_audio_file_extension;
    svt_video_format_input.value = defaultOptions.svt_video_format.join(',');
    add_source_id_to_filename_input.checked = defaultOptions.add_source_id_to_filename;
    ffmpeg_command_input.value = defaultOptions.ffmpeg_command;
    output_path_input.value = defaultOptions.output_path;
  });

  if (isAndroid) {
    // Hide stuff that doesn't apply to the Android version
    default_video_file_extension_input.parentElement.classList.add('d-none');
    default_video_file_extension_input.parentElement.nextElementSibling.classList.add('d-none');
    default_audio_file_extension_input.parentElement.classList.add('d-none');
    default_audio_file_extension_input.parentElement.nextElementSibling.classList.add('d-none');
    add_source_id_to_filename_input.parentElement.classList.add('d-none');
    add_source_id_to_filename_input.parentElement.nextElementSibling.classList.add('d-none');
    ffmpeg_command_input.parentElement.classList.add('d-none');
    ffmpeg_command_input.parentElement.nextElementSibling.classList.add('d-none');
    output_path_input.parentElement.classList.add('d-none');
    output_path_input.parentElement.nextElementSibling.classList.add('d-none');
  }
});
