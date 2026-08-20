/**
 * Compresses a raw video file using native browser Canvas drawing + MediaRecorder.
 * Ideal for web/mobile optimization, removing audio (for muted loop banners)
 * and lowering resolution & bitrate without any heavy WASM dependencies.
 * 
 * @param {File} file - The original raw video File
 * @param {Function} onProgress - Progress callback receiving percentage (0 - 100)
 * @returns {Promise<File>} A promise resolving to the compressed video File
 */
export const compressVideo = (file, onProgress) => {
  return new Promise((resolve, reject) => {
    // 1. Create a video element to load the source video
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.src = URL.createObjectURL(file);

    // Enforce timeout if video loading gets stuck
    const loadTimeout = setTimeout(() => {
      cleanup();
      reject(new Error('Video loading timed out. The file might be corrupted.'));
    }, 15000);

    const cleanup = () => {
      clearTimeout(loadTimeout);
      video.pause();
      video.removeAttribute('src');
      video.load();
    };

    video.onloadedmetadata = () => {
      clearTimeout(loadTimeout);
      
      try {
        // 2. Determine target dimensions (Cap resolution to 720p / max dimension 1280px)
        const maxDim = 1280;
        let width = video.videoWidth;
        let height = video.videoHeight;
        
        if (width <= 0 || height <= 0) {
          throw new Error('Could not read video dimensions.');
        }

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        // 3. Setup canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { alpha: false });

        // 4. Capture Canvas stream (30fps)
        const fps = 30;
        const stream = canvas.captureStream(fps);

        // 5. Check supported mimeType for recording
        let mimeType = 'video/webm;codecs=vp8';
        if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264')) {
          mimeType = 'video/mp4;codecs=h264';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
          mimeType = 'video/mp4';
        }

        // 6. Initialize MediaRecorder with optimized bitrate (1.5 Mbps for 720p)
        const recorderOptions = {
          mimeType,
          videoBitsPerSecond: 1500000 // 1.5 Mbps target
        };

        const mediaRecorder = new MediaRecorder(stream, recorderOptions);
        const chunks = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          cleanup();
          const compressedBlob = new Blob(chunks, { type: mimeType });
          
          // Generate file extension
          const ext = mimeType.includes('mp4') ? '.mp4' : '.webm';
          const compressedFile = new File(
            [compressedBlob],
            file.name.replace(/\.[^/.]+$/, "") + '-compressed' + ext,
            { type: mimeType }
          );
          resolve(compressedFile);
        };

        // 7. Start rendering frame-by-frame on Canvas and recording
        mediaRecorder.start();
        video.play();

        const renderLoop = () => {
          if (video.paused || video.ended) {
            // Processing complete
            if (mediaRecorder.state !== 'inactive') {
              mediaRecorder.stop();
            }
            return;
          }

          // Draw current video frame to canvas
          ctx.drawImage(video, 0, 0, width, height);

          // Update progress percentage
          if (video.duration && video.duration > 0) {
            const pct = Math.min(Math.round((video.currentTime / video.duration) * 100), 99);
            onProgress(pct);
          }

          requestAnimationFrame(renderLoop);
        };

        requestAnimationFrame(renderLoop);

      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Browser failed to load the video file.'));
    };
  });
};
