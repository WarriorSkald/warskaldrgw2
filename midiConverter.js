document.addEventListener("DOMContentLoaded", function () {
    let midiInput = document.getElementById("midiFileInput");
    let output = document.getElementById("output");

    if (!midiInput || !output) {
        console.error("Error: Could not find necessary HTML elements.");
        return;
    }

    midiInput.addEventListener("change", async function (event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function (e) {
            try {
                const midiData = e.target.result;
                const midi = new TonejsMidi(midiData);
                console.log("MIDI loaded successfully!");
                convertToJianpu(midi);
            } catch (error) {
                console.error("Error parsing MIDI file:", error);
            }
        };
        reader.readAsArrayBuffer(file);
    });

    function convertToJianpu(midi) {
        let outputText = "";

        midi.tracks.forEach(track => {
            if (track.notes.length === 0) return;

            outputText += `Track: ${track.name || "Untitled"}\n\n`;

            // Sort notes by start time
            let sortedNotes = track.notes.sort((a, b) => a.time - b.time);

            // Group notes by start time to form chords
            let noteGroups = {};
            sortedNotes.forEach(note => {
                let startTime = Math.round(note.time * 100) / 100; // Round to avoid floating point issues
                if (!noteGroups[startTime]) {
                    noteGroups[startTime] = [];
                }
                noteGroups[startTime].push(note);
            });

            let lastTime = -1;
            Object.keys(noteGroups)
                .map(time => parseFloat(time))
                .sort((a, b) => a - b) // Sort start times
                .forEach(startTime => {
                    let notes = noteGroups[startTime];

                    // Detect rests (if there’s a gap before this note)
                    if (lastTime >= 0 && startTime > lastTime) {
                        let restDuration = (startTime - lastTime) * 4; // Convert to beats
                        let restSymbol = restDuration >= 1 ? "~" : "-"; // Quarter or eighth rest
                        let restSpaces = " ".repeat(Math.round(restDuration * 2)); // Restore spacing
                        outputText += restSymbol + restSpaces;
                    }

                    // Sort notes in ascending order of MIDI value before converting to Jianpu
                    let chordJianpu = notes
                        .sort((a, b) => a.midi - b.midi) // Sort by MIDI number
                        .map(note => {
                            let pitch = note.midi % 12;
                            let octave = Math.floor(note.midi / 12) - 1;

                            // Map MIDI pitch to Jianpu (1=C, 2=D, etc.)
                            const jianpuMap = ["1", "1#", "2", "2#", "3", "4", "4#", "5", "5#", "6", "6#", "7"];
                            let jianpu = jianpuMap[pitch] || "?";

                            // Apply octave notation
                            if (octave <= 3) {
                                jianpu = `[${jianpu}]`; // Low octave → square brackets
                            } else if (octave >= 5) {
                                jianpu = `(${jianpu})`; // High octave → round brackets
                            }
                            return jianpu;
                        });

                    // Get the duration of this note or chord (convert to quarter note length)
                    let durationInBeats = notes[0].duration * 4;
                    let noteSpaces = " ".repeat(Math.round(durationInBeats * 2)); // Restore spacing

                    outputText += chordJianpu.join("/") + noteSpaces; // Chords are printed as "note1/note2/note3"

                    lastTime = startTime; // Update last time to current note's start time
                });

            outputText += "\n\n"; // Extra space between tracks
        });

        output.textContent = outputText;
    }
});
