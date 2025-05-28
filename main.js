const noteElement = document.getElementById("note");
const frequencyElement = document.getElementById("frequency");
const audioFileInput = document.getElementById("audioFile");
const startButton = document.getElementById("start");

const noteFrequencies = [
  {note: "C", frequency: 261.63},
  {note: "C#", frequency: 277.18},
  {note: "D", frequency: 293.66},
  {note: "D#", frequency: 311.13 },
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
    while (frequency < 261.63) frequency *= 2;
    while (frequency > 493.88) frequency /= 2;

    let closest = noteFrequencies[0];
    let minDiff = Math.abs(frequency - closest.frequency);
    for (const note of noteFrequencies) {
        const diff = Math.abs(frequency - note.frequency);
        if (diff < minDiff) {
            minDiff = diff;
            closest = note;
        }
    }
    return closest.note;
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