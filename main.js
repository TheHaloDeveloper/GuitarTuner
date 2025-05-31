const noteElement = document.getElementById("note");
const frequencyElement = document.getElementById("frequency");
const audioFileInput = document.getElementById("audioFile");
const startButton = document.getElementById("start");

const noteFrequencies = [
  {note: "C", frequency: 261.63},
  {note: "C#", frequency: 277.18},
  {note: "D", frequency: 293.66},
  {note: "D#", frequency: 311.13},
  {note: "E", frequency: 329.63},
  {note: "F", frequency: 349.23},
  {note: "F#", frequency: 369.99},
  {note: "G", frequency: 392.00},
  {note: "G#", frequency: 415.30},
  {note: "A", frequency: 440.00},
  {note: "A#", frequency: 466.16},
  {note: "B", frequency: 493.88},
];

function getClosestNote(frequency) {
    if (frequency <= 0) return "Unknown";
    const referenceFrequency = 261.63;
    const semitonesFromC = Math.round(12 * Math.log2(frequency / referenceFrequency));
    const noteIndex = ((semitonesFromC % 12) + 12) % 12;
    return noteFrequencies[noteIndex].note;
}

function autoCorrelate(buffer, sampleRate) {
    const SIZE = buffer.length;
    let bestOffset = -1;
    let bestCorrelation = 0;
    let rms = 0;

    for (let i = 0; i < SIZE; i++) {
        const val = buffer[i];
        rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1;

    for (let offset = 32; offset < 512; offset++) {
        let correlation = 0;
        for (let i = 0; i < SIZE - offset; i++) {
            correlation += buffer[i] * buffer[i + offset];
        }
        correlation = correlation / (SIZE - offset);
        if (correlation > bestCorrelation) {
            bestCorrelation = correlation;
            bestOffset = offset;
        }
    }

    if (bestCorrelation > 0.01) return sampleRate / bestOffset;
    return -1;
}

function detectFrequency(analyser, buffer, sampleRate) {
    analyser.getFloatTimeDomainData(buffer);
    const freq = autoCorrelate(buffer, sampleRate);
    if (freq > 0) {
        const note = getClosestNote(freq);
        noteElement.textContent = note;
        frequencyElement.textContent = freq.toFixed(2);
    }
}

startButton.addEventListener("click", async () => {
    const file = audioFileInput.files[0];
    if (!file) return alert("Please select an audio file");

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    const buffer = new Float32Array(analyser.fftSize);

    source.connect(analyser);
    analyser.connect(audioContext.destination);
    source.start();

    setInterval(() => {
        analyser.getFloatTimeDomainData(buffer);
        const freq = autoCorrelate(buffer, audioContext.sampleRate);
        if (freq > 0) {
            const note = getClosestNote(freq);
            noteElement.textContent = note;
            frequencyElement.textContent = freq.toFixed(2);
        }
    }, 500);
});

let micStream = null;
let micAnalyser = null;
let micBuffer = null;
let micInterval = null;

async function startMicDetection() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContext.createMediaStreamSource(micStream);

    micAnalyser = audioContext.createAnalyser();
    micAnalyser.fftSize = 2048;
    micBuffer = new Float32Array(micAnalyser.fftSize);

    source.connect(micAnalyser);

    function micLoop() {
        if (!micStream) return;
        detectFrequency(micAnalyser, micBuffer, audioContext.sampleRate);
        requestAnimationFrame(micLoop);
    }
    micLoop();
}

function stopMicDetection() {
    if (micInterval) clearInterval(micInterval);
    if (micStream) {
        micStream.getTracks().forEach((track) => track.stop());
    }
    micStatus.textContent = "Microphone: Off";
    micStream = null;
}

const micToggle = document.getElementById("micToggle");
const micStatus = document.getElementById("micStatus");

micToggle.addEventListener("click", async () => {
    if (!micStream) {
        await startMicDetection();
        micStatus.textContent = "Microphone: On";
    } else {
        stopMicDetection();
    }
});

window.addEventListener("beforeunload", stopMicDetection);