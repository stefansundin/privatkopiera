// Example URL:
// https://sverigesradio.se/sida/artikel.aspx?programid=493&artikel=6411195
// Example URL with multiple streams:
// https://sverigesradio.se/sida/artikel.aspx?programid=83&artikel=6412615
// Metadata URL:
// https://sverigesradio.se/sida/playerajax/AudioMetadata?id=5678841&type=clip
// Get audio URL:
// https://sverigesradio.se/sida/playerajax/getaudiourl?id=5678841&type=clip&quality=high&format=iis


function sr_callback(stream, option) {
  return function(data) {
    var ext = extract_extension(data.audioUrl) || "mp3"
    option.value = data.audioUrl
    option.setAttribute("data-filename", `${stream.title}.${ext}`)
    update_cmd()
  }
}

matchers.push({
  re: /^https?:\/\/(?:www\.)?sverigesradio\.se(\/.*)/,
  func: function(ret) {
    // Find audio streams by looking for data-audio-id attributes
    chrome.tabs.executeScript({
      code: `(function(){
        const ids = [];
        var streams = [];
        var related = document.getElementsByTagName("article")[0].querySelectorAll("[data-audio-id]");
        for (var i=0; i < related.length; i++) {
          var link = related[i];
          const id = link.getAttribute("data-audio-id");
          if (ids.includes(id)) {
            continue;
          }
          ids.push(id);
          var header = link;
          while (header.children.length < 2) {
            header = header.parentNode;
          }
          var title_element = header.getElementsByClassName("main-audio-new__title")[0] || header.getElementsByClassName("related-audio__title")[0] || header.getElementsByClassName("article-audio-details__header-title")[0];
          if (title_element) {
            var title = title_element.textContent.trim();
          }
          else {
            var title = document.title;
            var dash = title.lastIndexOf("-");
            if (dash != -1) {
              title = title.substr(0, dash).trim();
            }
          }
          streams.push({
            id: id,
            type: link.getAttribute("data-audio-type"),
            title: title,
          });
        }
        return streams;
      })()`
    }, function(streams) {
      var dropdown = $("#streams")
      console.log(streams)
      flatten(streams).forEach(function(stream) {
        // Create the option here so we always get them in the same order
        var option = document.createElement("option")
        option.appendChild(document.createTextNode(stream.title))
        dropdown.appendChild(option)

        var data_url = `https://sverigesradio.se/sida/playerajax/getaudiourl?id=${stream.id}&type=${stream.type}&quality=high&format=iis`
        $("#open_json").href = data_url

        console.log(data_url)
        fetch(data_url).then(get_json).then(sr_callback(stream, option)).catch(api_error)
      })
    })
  }
})
