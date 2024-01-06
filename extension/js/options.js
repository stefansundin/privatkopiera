import default_options from './default_options.js';
import { isAndroid } from './utils.js';

const options = {
  default_video_file_extension:
    localStorage.default_video_file_extension ||
    default_options.default_video_file_extension,
  default_audio_file_extension:
    localStorage.default_audio_file_extension ||
    default_options.default_audio_file_extension,
  ffmpeg_command: localStorage.ffmpeg_command || default_options.ffmpeg_command,
  output_path: localStorage.output_path || default_options.output_path,
};

document.addEventListener('DOMContentLoaded', async () => {
  const platformInfo = await chrome.runtime.getPlatformInfo();
  const pathSeparator = platformInfo.os === 'win' ? '\\' : '/';
  const exampleOutputPath =
    platformInfo.os === 'win'
      ? 'C:\\Användare\\Svensson\\Skrivbord\\'
      : platformInfo.os === 'mac'
      ? '/Users/Svensson/Downloads/'
      : '/home/svensson/Downloads/';

  const theme =
    localStorage.getItem('theme') ??
    (window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light');
  document.documentElement.setAttribute('data-bs-theme', theme);

  if (isAndroid) {
    document.body.classList.add('mobile');
    document.body.textContent =
      'Det finns inga inställningar som gäller för Android än.';
    return;
  }

  document.getElementById('example_output_path').textContent =
    exampleOutputPath;

  const default_video_file_extension_input = document.getElementById(
    'default_video_file_extension',
  );
  const default_audio_file_extension_input = document.getElementById(
    'default_audio_file_extension',
  );
  const ffmpeg_command_input = document.getElementById('ffmpeg_command');
  const output_path_input = document.getElementById('output_path');
  const save_button = document.getElementById('save');

  default_video_file_extension_input.value =
    options.default_video_file_extension;
  default_audio_file_extension_input.value =
    options.default_audio_file_extension;
  ffmpeg_command_input.value = options.ffmpeg_command;
  output_path_input.value = options.output_path;

  save_button.addEventListener('click', async () => {
    localStorage.default_video_file_extension =
      default_video_file_extension_input.value;
    localStorage.default_audio_file_extension =
      default_audio_file_extension_input.value;
    localStorage.ffmpeg_command = ffmpeg_command_input.value;

    if (
      output_path_input.value !== '' &&
      !output_path_input.value.endsWith(pathSeparator)
    ) {
      output_path_input.value += pathSeparator;
    }
    localStorage.output_path = output_path_input.value;
  });

  for (const input of document.querySelectorAll("input[type='text']")) {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        save_button.focus();
        save_button.click();
      }
    });
  }

  document.getElementById('reset').addEventListener('click', async () => {
    delete localStorage.default_video_file_extension;
    delete localStorage.default_audio_file_extension;
    delete localStorage.ffmpeg_command;
    delete localStorage.output_path;
    default_video_file_extension_input.value =
      default_options.default_video_file_extension;
    default_audio_file_extension_input.value =
      default_options.default_audio_file_extension;
    ffmpeg_command_input.value = default_options.ffmpeg_command;
    output_path_input.value = default_options.output_path;
  });
});
