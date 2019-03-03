"use strict";

var canvas;
var result;
var context;
var analyser;
var total = 0;
var dataArray;
var final = "";
var onlinePlayer;
var bufferLength;
var fileName = "output";

function setup() {
	canvas = document.getElementById("canvas");
	context = canvas.getContext("2d", { alpha: false });
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	window.addEventListener("dragenter", drag);
	window.addEventListener("dragover", drag);
	window.addEventListener("drop", drop);
	if (window.ontouchstart) {
		window.addEventListener("touchstart", clicked);
	} else {
		window.addEventListener("mousedown", clicked);
	}
	onlinePlayer = new (window.AudioContext || window.webkitAudioContext)();
	drawText("DROP AUDIO HERE!");
}

function drag(e) {
	e.preventDefault();
	e.dataTransfer.dropEffect = "copy";
}

function drop(e) {
	e.preventDefault();
	if (e.dataTransfer && e.dataTransfer.files) {
		decode(e.dataTransfer.files[0]);
	}
}

function clicked(e) {
	e.preventDefault();
	if (final) {
		var blob = new Blob([final], { type: "text/csv" });
		var url = window.URL.createObjectURL(blob);
		var download = document.getElementById("download");
		download.href = url;
		download.download = fileName + ".csv";
		download.click();
		window.URL.revokeObjectURL(url);
	} else {
		document.getElementById("file").click();
	}
}

function upload(e) {
	decode(e.files[0]);
}

function decode(file) {
	if (file.type.indexOf("audio") !== -1) {
		var reader = new FileReader();
		reader.onload = function() {
			total = 0;
			drawText("THANKS!");
			fileName = file.name.replace(/\.[^/.]+$/, "");
			onlinePlayer.decodeAudioData(this.result, function(buffer) {
				var offlinePlayer = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
				var processor = offlinePlayer.createScriptProcessor(256, buffer.numberOfChannels, buffer.numberOfChannels);
				processor.onaudioprocess = getFrequency;
				processor.connect(offlinePlayer.destination);
				analyser = offlinePlayer.createAnalyser();
				analyser.fftSize = 32768;
				analyser.smoothingTimeConstant = 0;
				bufferLength = analyser.frequencyBinCount;
				dataArray = new Float32Array(bufferLength);
				result = new Float32Array(bufferLength);
				result.fill(0);
				var source = offlinePlayer.createBufferSource();
				source.buffer = buffer;
				source.connect(analyser);
				analyser.connect(offlinePlayer.destination);
				source.start();
				offlinePlayer.startRendering();
				offlinePlayer.oncomplete = drawData;
			});
		};
		reader.readAsArrayBuffer(file);
	} else {
		drawText("AUDIO PLEASE!");
	}
}

function getFrequency() {
	analyser.getFloatFrequencyData(dataArray);
	for (var i = 0; i < bufferLength; i++) {
		if (dataArray[i] !== -Infinity) {
			result[i] += dataArray[i];
		}
	}
	total++;
}

function frequencyScale(value) {
	return (22050 * value) / (bufferLength - 1);
}

function drawBackground() {
	context.fillStyle = "black";
	context.fillRect(0, 0, canvas.width, canvas.height);
}


function drawText(text) {
	drawBackground();
	context.fillStyle = "white";
	context.textAlign = "center";
	context.textBaseline = "middle";
	context.font = (canvas.width * 0.05) + "px Arial";
	context.fillText(text, canvas.width * 0.5, canvas.height * 0.5);
}

function drawData() {
	drawBackground();
	var minHeight = drawInfo();
	final = "Frequency (Hz),Amplitude (dB)";
	for (var j = 0; j < bufferLength; j++) {
		final += "\n" + frequencyScale(j) + "," + result[j];
		var fraction = result[j] / minHeight;
		var barHeight = canvas.height * fraction;
		context.fillStyle = "rgb(" + (255 - (fraction * 255)) + ", " + (255 - (fraction * 512)) + ", " + (fraction * 255) + ")";
		context.fillRect(canvas.width * (j / bufferLength), barHeight, 1, canvas.height - barHeight);
	}
}

function drawInfo() {
	var minFrequency = 0;
	var maxFrequency = 0;
	var minDecibel = 0;
	var maxDecibel = result[0];
	for (var i = 0; i < bufferLength; i++) {
		result[i] /= total;
		if (result[i] <= minDecibel) {
			minDecibel = result[i];
			minFrequency = i;
		}
		if (result[i] >= maxDecibel) {
			maxDecibel = result[i];
			maxFrequency = i;
		}
	}
	context.fillStyle = "white";
	context.textAlign = "right";
	context.textBaseline = "top";
	context.font = "16px Arial";
	context.fillText("Results: " + bufferLength, canvas.width - 16, 16);
	context.fillText("Processed: " + total, canvas.width - 16, 36);
	context.fillText("Softest Frequency: " + Math.floor(frequencyScale(minFrequency)) + "Hz", canvas.width - 16, 56);
	context.fillText("Softest Decibel: " + Math.floor(minDecibel) + "dB", canvas.width - 16, 76);
	context.fillText("Loudest Frequency: " + Math.floor(frequencyScale(maxFrequency)) + "Hz", canvas.width - 16, 96);
	context.fillText("Loudest Decibel: " + Math.floor(maxDecibel) + "dB", canvas.width - 16, 116);
	return minDecibel;
}