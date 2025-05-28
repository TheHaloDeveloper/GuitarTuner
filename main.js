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
    let closestNote = noteFrequencies[0];
    let minDifference = Math.abs(frequency - closestNote.frequency);

    for (const note of noteFrequencies) {
        const difference = Math.abs(frequency - note.frequency);
        if (difference < minDifference) {
            closestNote = note;
            minDifference = difference;
        }
    }

    return closestNote;
}

async function startNoteDetection() {
    const file = audioFileInput.files[0];
    if (!file) {
        alert("Please select an MP3 file first.");
        return;
    }

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;

    const fileReader = new FileReader();
    fileReader.onload = async (event) => {
        const arrayBuffer = event.target.result;
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(analyser);
        analyser.connect(audioContext.destination);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);

        const samples = [];

        function detectPitch() {
            analyser.getFloatFrequencyData(dataArray);

            let maxAmplitude = -Infinity;
            let maxIndex = -1;

            for (let i = 0; i < dataArray.length; i++) {
                if (dataArray[i] > maxAmplitude) {
                    maxAmplitude = dataArray[i];
                    maxIndex = i;
                }
            }

            const frequency = audioContext.sampleRate * maxIndex / analyser.fftSize;
            samples.push(frequency);

            if (samples.length > 50) {
                samples.shift();
            }

            const averageFrequency = samples.reduce((sum, freq) => sum + freq, 0) / samples.length;

            const closestNote = getClosestNote(averageFrequency);

            noteElement.textContent = closestNote.note;
            frequencyElement.textContent = averageFrequency.toFixed(2);

            requestAnimationFrame(detectPitch);
        }

        source.start();
        detectPitch();
    };

    fileReader.readAsArrayBuffer(file);
}

startButton.addEventListener("click", startNoteDetection);