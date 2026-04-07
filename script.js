const { createFFmpeg, fetchFile } = FFmpeg;

let ffmpeg = null;
let selectedFiles = [];

const btnFileTrigger = document.getElementById('btn-file-trigger');
const btnFolderTrigger = document.getElementById('btn-folder-trigger');
const inputFile = document.getElementById('input-file');
const inputFolder = document.getElementById('input-folder');

const targetDisplay = document.getElementById('target-display');
const targetCount = document.getElementById('target-count');
const btnConvert = document.getElementById('btn-convert');
const progressArea = document.getElementById('progress-area');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const logsContainer = document.getElementById('logs');
const downloadOverlay = document.getElementById('download-overlay');
const downloadMsg = document.getElementById('download-msg');
const checkAlpha = document.getElementById('check-alpha');

function log(msg, type = 'info') {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    const time = new Date().toLocaleTimeString();
    entry.textContent = `[${time}] ${msg}`;
    if (type === 'error') entry.style.color = 'var(--error)';
    if (type === 'success') entry.style.color = 'var(--success)';
    logsContainer.appendChild(entry);
    logsContainer.scrollTop = logsContainer.scrollHeight;
}

async function initFFmpeg() {
    if (ffmpeg && ffmpeg.isLoaded()) return;
    
    try {
        log("Booting conversion engine (v0.11)...");

        // On GitHub Pages, we need to be very explicit about the paths.
        // We'll try to load from the local repo first, then fallback to CDN.
        const baseURL = window.location.origin + window.location.pathname.replace(/\/$/, '');
        
        ffmpeg = createFFmpeg({ 
            log: true,
            corePath: `${baseURL}/ffmpeg-core.js`,
            workerPath: `${baseURL}/ffmpeg-core.worker.js`
        });

        ffmpeg.setLogger(({ message }) => {
            console.log("FFmpeg:", message);
            if (message.toLowerCase().includes('error')) log(message, 'error');
        });

        await ffmpeg.load();
        
        log("Engine ready! Starting conversion...", "success");
    } catch (err) {
        log("CRITICAL ERROR: " + err.message, "error");
        console.error("FFmpeg Load Error:", err);
    }
}

function handleFileSelection(event) {
    const files = Array.from(event.target.files).filter(f => f.type.startsWith('video/') || f.name.match(/\.(mkv|avi|mov|wmv|flv|webm|m4v|mpg|mpeg)$/i));
    
    if (files.length > 0) {
        selectedFiles = files;
        targetCount.textContent = selectedFiles.length;
        targetDisplay.style.display = 'block';
        btnConvert.disabled = false;
        btnFileTrigger.classList.add('active');
        btnFolderTrigger.classList.remove('active');
        log(`Selected ${files.length} file(s) for processing.`);
    }
}

btnFileTrigger.addEventListener('click', () => inputFile.click());
btnFolderTrigger.addEventListener('click', () => inputFolder.click());

inputFile.addEventListener('change', handleFileSelection);
inputFolder.addEventListener('change', (e) => {
    handleFileSelection(e);
    btnFolderTrigger.classList.add('active');
    btnFileTrigger.classList.remove('active');
});

btnConvert.addEventListener('click', async () => {
    const useAlpha = checkAlpha.checked;

    // --- LOCAL MODE (Python/Eel) ---
    if (window.eel && localPath) {
        btnConvert.disabled = true;
        btnConvert.textContent = 'Processing...';
        progressArea.style.display = 'flex';
        log(`Transferred to system engine: ${localPath} ${useAlpha ? '[ALPHA MODE]' : ''}`);
        eel.start_conversion(localPath, isLocalFolder, useAlpha);
        return; // Skip browser-based logic
    }

    // --- CLOUD MODE (WASM) ---
    if (selectedFiles.length === 0) return;

    btnConvert.disabled = true;
    btnConvert.textContent = 'Processing...';
    progressArea.style.display = 'flex';
    
    await initFFmpeg();

    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileName = file.name;
        const outputName = fileName.substring(0, fileName.lastIndexOf('.')) + '_converted.mp4';

        log(`Processing: ${fileName} (${i + 1}/${selectedFiles.length})`);
        progressText.textContent = `Converting ${i + 1} of ${selectedFiles.length}...`;
        progressBar.style.width = `${((i) / selectedFiles.length) * 100}%`;

        try {
            // Write to virtual filesystem
            ffmpeg.FS('writeFile', fileName, await fetchFile(file));

            const useAlpha = checkAlpha.checked;
            const finalOutputName = useAlpha ? 
                fileName.substring(0, fileName.lastIndexOf('.')) + '_alpha.mov' : 
                outputName;

            log(`Processing: ${fileName} (${i + 1}/${selectedFiles.length}) ${useAlpha ? '[ALPHA MODE]' : ''}`);

            if (useAlpha) {
                log(`Encoding ProRes Proxy with Alpha for ${fileName}...`);
                // -c:v prores_ks -profile:v 0 is ProRes Proxy. 
                // We use prores_ks because it handles alpha properly.
                await ffmpeg.run('-i', fileName, '-c:v', 'prores_ks', '-profile:v', '0', '-c:a', 'pcm_s16le', finalOutputName);
            } else {
                // Try Stream Copy first for standard MP4
                log(`Attempting fast stream copy for ${fileName}...`);
                await ffmpeg.run('-i', fileName, '-c:v', 'copy', '-c:a', 'aac', finalOutputName);
            }

            // Read result
            const data = ffmpeg.FS('readFile', finalOutputName);
            
            // Trigger automatic download
            const blob = new Blob([data.buffer], { type: useAlpha ? 'video/quicktime' : 'video/mp4' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = finalOutputName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            log(`Successfully converted ${fileName}`, 'success');
            
            // Clean up virtual FS
            ffmpeg.FS('unlink', fileName);
            ffmpeg.FS('unlink', finalOutputName);

        } catch (err) {
            log(`Error converting ${fileName}: ${err.message}`, 'error');
            log(`Retrying with full H.264 encode...`);
            try {
                await ffmpeg.run('-i', fileName, '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', '-vf', 'format=yuv420p', outputName);
                const data = ffmpeg.FS('readFile', outputName);
                const blob = new Blob([data.buffer], { type: 'video/mp4' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = outputName;
                a.click();
                log(`Successfully encoded ${fileName}`, 'success');
                ffmpeg.FS('unlink', outputName);
            } catch (retryErr) {
                log(`Fallback failed: ${retryErr.message}`, 'error');
            }
        }
        
        progressBar.style.width = `${((i + 1) / selectedFiles.length) * 100}%`;
    }

    progressBar.style.width = '100%';
    progressText.textContent = 'All conversions complete!';
    btnConvert.textContent = 'Start Conversion';
    btnConvert.disabled = false;
    
    downloadMsg.textContent = `Processed ${selectedFiles.length} file(s). Checks downloads!`;
    downloadOverlay.style.display = 'flex';
});

// --- EEL CALLBACKS (For Local Mode) ---
if (window.eel) {
    eel.expose(log_message);
    function log_message(msg) {
        log(msg);
    }

    eel.expose(update_progress);
    function update_progress(current, total) {
        progressArea.style.display = 'flex';
        progressBar.style.width = `${(current / total) * 100}%`;
        progressText.textContent = `Processing ${current} of ${total}...`;
    }

    eel.expose(conversion_finished);
    function conversion_finished() {
        btnConvert.disabled = false;
        btnConvert.textContent = 'Start Conversion';
        downloadMsg.textContent = "Conversion complete! Files saved in their original folders.";
        downloadOverlay.style.display = 'flex';
    }
}

// Override selection triggers for Local Mode
if (window.eel) {
    btnFileTrigger.onclick = async (e) => {
        e.preventDefault();
        const path = await eel.select_file()();
        if (path) {
            localPath = path;
            isLocalFolder = false;
            targetCount.textContent = "1";
            targetDisplay.style.display = 'block';
            btnConvert.disabled = false;
            btnFileTrigger.classList.add('active');
            btnFolderTrigger.classList.remove('active');
            log(`Selected local file: ${path}`);
        }
    };

    btnFolderTrigger.onclick = async (e) => {
        e.preventDefault();
        const path = await eel.select_folder()();
        if (path) {
            localPath = path;
            isLocalFolder = true;
            targetCount.textContent = "Folder Selected";
            targetDisplay.style.display = 'block';
            btnConvert.disabled = false;
            btnFolderTrigger.classList.add('active');
            btnFileTrigger.classList.remove('active');
            log(`Selected local folder: ${path}`);
        }
    };
}

let localPath = null;
let isLocalFolder = false;

// Override Conversion Button for Local Mode
const originalBtnConvertClick = btnConvert.onclick; 
// Actually we used addEventListener, so we should check inside the listener...
// Let's modify the listener at the top of the file in the next step or just use a flag.
