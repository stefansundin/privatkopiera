// Example URL:
// https://sverigesradio.se/sida/artikel.aspx?programid=493&artikel=6411195
// Example URL with multiple streams:
// https://sverigesradio.se/sida/artikel.aspx?programid=83&artikel=6412615
// Metadata URL: (seems to be deprecated now)
// https://sverigesradio.se/sida/ajax/getplayerinfo?url=%2Fsida%2Fartikel.aspx%3Fprogramid%3D493%26artikel%3D6411195%26playaudio%3D5677543&isios=false&playertype=html5
// Metadata URL:
// https://sverigesradio.se/sida/playerajax/AudioMetadata?id=5678841&type=clip
// Get audio URL:
// https://sverigesradio.se/sida/playerajax/getaudiourl?id=5678841&type=clip&quality=high&format=iis


function sr_callback(stream, option) {
  return function() {
    console.log(this)
    if (this.status != 200) {
      api_error(this.responseURL, this.status)
      return
    }

    var data = JSON.parse(this.responseText)
    console.log(data)

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
        var streams = [];
        var related = document.getElementsByTagName("article")[0].querySelectorAll("[data-audio-id]");
        for (var i=0; i < related.length; i++) {
          var link = related[i];
          var header = link;
          while (header.className != "article-audio-details__header") {
            header = header.parentNode;
          }
          var title_element = header.getElementsByClassName("main-audio-new__title")[0] || header.getElementsByClassName("related-audio__title")[0] || header.getElementsByClassName("article-audio-details__header-title")[0];
          if (title_element) {
            var title = title_element.textContent.trim();
          }
          else {
            var title = document.title;
            var dash = title.indexOf("-");
            if (dash != -1) {
              title = title.substr(0, dash).trim();
            }
          }
          streams.push({
            id: link.getAttribute("data-audio-id"),
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
        console.log(stream)

        // Create the option here so we always get them in the same order
        var option = document.createElement("option")
        option.appendChild(document.createTextNode(stream.title))
        dropdown.appendChild(option)

        var data_url = `https://sverigesradio.se/sida/playerajax/getaudiourl?id=${stream.id}&type=${stream.type}&quality=high&format=iis`
        $("#open_json").href = data_url

        var xhr = new XMLHttpRequest()
        xhr.addEventListener("load", sr_callback(stream, option))
        xhr.open("GET", data_url)
        xhr.send()
      })
    })
  }
})
