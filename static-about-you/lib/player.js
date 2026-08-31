document.addEventListener("DOMContentLoaded", () => {
  const audio = document.getElementById("audio");
  const canvas = document.getElementById("oscilloscope");
  const playlistDataEl = document.getElementById("playlist-data");
  const playlistEl = document.getElementById("playlist");

  if (!audio || !canvas || !playlistDataEl || !playlistEl) {
    console.error("Required DOM elements missing.");
    return;
  }

  let playlist;
  try {
    playlist = JSON.parse(playlistDataEl.textContent);
  } catch (e) {
    console.error("Failed to parse playlist JSON:", e);
    return;
  }

  // Oscilloscope Class
  class Oscilloscope {
    constructor(audioElement, canvasElement, options = {}) {
      this.audio = audioElement;
      this.canvas = canvasElement;
      this.ctx = canvasElement.getContext("2d");

      this.audioContext = null;
      this.analyser = null;
      this.source = null;
      this.animationId = null;
      this.dataArray = null;
      this.bufferLength = 0;

      this.fftSize = options.fftSize || 1024;
      this.fps = options.fps || 30;
      this.lineWidth = options.lineWidth || 2;
      this.strokeStyle = options.strokeStyle || "#595959";

      this.width = 0;
      this.height = 0;
      this.lastRenderTime = 0;
      this.lastWasPlaying = false;

      this._resizeHandler = () => this._resizeCanvas();

      this._init();
    }

    _init() {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn("Web Audio API not supported.");
        return;
      }

      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.bufferLength = this.analyser.fftSize;
      this.dataArray = new Uint8Array(this.bufferLength);

      this.source = this.audioContext.createMediaElementSource(this.audio);
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      this._resizeCanvas();
      window.addEventListener("resize", this._resizeHandler, { passive: true });

      if (this.audioContext.state === "suspended") {
        const resume = () => {
          this.audioContext.resume();
          this.start();
          window.removeEventListener("click", resume);
          window.removeEventListener("keydown", resume);
        };
        window.addEventListener("click", resume);
        window.addEventListener("keydown", resume);
      } else {
        this.start();
      }
    }

    _resizeCanvas() {
      const dpr = window.devicePixelRatio || 1;
      const width = this.canvas.clientWidth * dpr;
      const height = this.canvas.clientHeight * dpr;

      if (this.canvas.width === width && this.canvas.height === height) return;

      this.canvas.width = width;
      this.canvas.height = height;

      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);

      this.width = this.canvas.clientWidth;
      this.height = this.canvas.clientHeight;
    }

    start() {
      if (this.animationId) return;

      const draw = (timestamp) => {
        this.animationId = requestAnimationFrame(draw);

        if (timestamp - this.lastRenderTime < 1000 / this.fps) return;
        this.lastRenderTime = timestamp;

        if (this.audio.paused || this.audio.ended) {
          if (this.lastWasPlaying) {
            this.ctx.clearRect(0, 0, this.width, this.height);
            this.lastWasPlaying = false;
          }
          return;
        }
        this.lastWasPlaying = true;

        this.analyser.getByteTimeDomainData(this.dataArray);

        const ctx = this.ctx;
        const width = this.width;
        const height = this.height;

        ctx.clearRect(0, 0, width, height);
        ctx.lineWidth = this.lineWidth;
        ctx.strokeStyle = this.strokeStyle;
        ctx.beginPath();

        const sliceWidth = width / this.bufferLength;
        let x = 0;

        for (let i = 0; i < this.bufferLength; i++) {
          const v = this.dataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
      };

      this.animationId = requestAnimationFrame(draw);
    }

    stop() {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    }

    destroy() {
      this.stop();
      if (this.source) this.source.disconnect();
      if (this.analyser) this.analyser.disconnect();
      if (this.audioContext) this.audioContext.close();
      window.removeEventListener("resize", this._resizeHandler);
    }
  }

  // Playlist Logic
  (() => {
    let currentTrackIndex = null;
    let oscilloscope = null;

    function getRandomTrackIndex(excludeIndex) {
      if (!playlist || playlist.length === 0) return -1;
      let index;
      do {
        index = Math.floor(Math.random() * playlist.length);
      } while (index === excludeIndex && playlist.length > 1);
      return index;
    }

    function loadTrack(index) {
      if (!playlist[index]) return;
      currentTrackIndex = index;
      audio.src = playlist[index].url;
      audio.play().catch((err) => console.warn("Audio playback failed", err));
      updateSelection(index);

      if (!oscilloscope) {
        oscilloscope = new Oscilloscope(audio, canvas, {
          fftSize: 1024,
          fps: 30,
          lineWidth: 2,
          strokeStyle: "#595959",
        });
      }
    }

    function updateSelection(selectedIndex) {
      const children = playlistEl.children;
      for (let i = 0; i < children.length; i++) {
        children[i].classList.toggle("selected", i === selectedIndex);
      }
    }

    const fragment = document.createDocumentFragment();
    playlist.forEach((song, idx) => {
      const li = document.createElement("li");
      const button = document.createElement("button");

      button.textContent = song.title;
      button.className = "playlist-button";
      button.addEventListener("click", () => loadTrack(idx));

      li.appendChild(button);
      fragment.appendChild(li);
    });
    playlistEl.appendChild(fragment);

    // Start playback
    const firstIndex = getRandomTrackIndex(null);
    if (firstIndex !== -1) loadTrack(firstIndex);

    audio.addEventListener("ended", () => {
      const nextIndex = getRandomTrackIndex(currentTrackIndex);
      if (nextIndex !== -1) loadTrack(nextIndex);
    });
  })();
});
