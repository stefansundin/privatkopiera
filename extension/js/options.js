import default_options from './default_options.js';

const options = {
  default_video_file_extension:
    localStorage.default_video_file_extension ||
    default_options.default_video_file_extension,
  default_audio_file_extension:
    localStorage.default_audio_file_extension ||
    default_options.default_audio_file_extension,
};

document.addEventListener('DOMContentLoaded', async () => {
  const default_video_file_extension_input = document.getElementById(
    'default_video_file_extension',
  );
  const default_audio_file_extension_input = document.getElementById(
    'default_audio_file_extension',
  );
  const save_button = document.getElementById('save');

  default_video_file_extension_input.value =
    options.default_video_file_extension;
  default_audio_file_extension_input.value =
    options.default_audio_file_extension;

  save_button.addEventListener('click', async () => {
    localStorage.default_video_file_extension =
      default_video_file_extension_input.value;
    localStorage.default_audio_file_extension =
      default_audio_file_extension_input.value;
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
    default_video_file_extension_input.value =
      default_options.default_video_file_extension;
    default_audio_file_extension_input.value =
      default_options.default_audio_file_extension;
  });

  const theme =
    localStorage.getItem('theme') ??
    (window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light');
  document.documentElement.setAttribute('data-bs-theme', theme);
});
