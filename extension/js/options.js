const default_options = {
  default_file_extension: 'mkv',
};

const options = {
  default_file_extension: localStorage.default_file_extension || default_options.default_file_extension,
};

document.addEventListener('DOMContentLoaded', async () => {
  const default_file_extension_input = document.getElementById('default_file_extension');
  const save_button = document.getElementById('save');

  default_file_extension_input.value = options.default_file_extension;

  save_button.addEventListener('click', async () => {
    localStorage.default_file_extension = default_file_extension_input.value;
  });

  for (const input of document.querySelectorAll("input[type='text']")) {
    input.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        save_button.focus();
        save_button.click();
      }
    });
  }

  document.getElementById('reset').addEventListener('click', async () => {
    delete localStorage.default_file_extension;
    default_file_extension_input.value = default_options.default_file_extension;
  });
});
