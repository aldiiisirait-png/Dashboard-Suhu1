// ===============================
// RTC SIMULASI
// ===============================

function updateRTC() {

    const sekarang = new Date();

    const tanggal = sekarang.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });

    const waktu = sekarang.toLocaleTimeString("id-ID");

    document.getElementById("tanggal").innerText = tanggal;
    document.getElementById("waktu").innerText = waktu;
}

setInterval(updateRTC, 1000);
updateRTC();


// ===============================
// DATA SENSOR SIMULASI
// ===============================

let suhu = 30.1;
let kelembapan = 74.3;


// ===============================
// GRAFIK
// ===============================

const labels = [];
const dataSuhu = [];
const dataKelembapan = [];

const ctxSuhu = document
    .getElementById("grafikSuhu")
    .getContext("2d");

const ctxKelembapan = document
    .getElementById("grafikKelembapan")
    .getContext("2d");


const chartSuhu = new Chart(ctxSuhu, {

    type: "line",

    data: {
        labels: labels,

        datasets: [{
            label: "Suhu (°C)",
            data: dataSuhu,
            borderWidth: 2,
            tension: 0.3
        }]
    },

    options: {
        responsive: true
    }
});


const chartKelembapan = new Chart(ctxKelembapan, {

    type: "line",

    data: {
        labels: labels,

        datasets: [{
            label: "Kelembapan (%)",
            data: dataKelembapan,
            borderWidth: 2,
            tension: 0.3
        }]
    },

    options: {
        responsive: true
    }
});


// ===============================
// UPDATE DATA
// ===============================

function updateSensor() {

    // simulasi perubahan sensor
    suhu += (Math.random() - 0.5) * 0.3;
    kelembapan += (Math.random() - 0.5) * 0.8;

    suhu = Number(suhu.toFixed(2));
    kelembapan = Number(kelembapan.toFixed(2));

    document.getElementById("suhu").innerText = suhu;
    document.getElementById("kelembapan").innerText = kelembapan;

    const waktu = new Date().toLocaleTimeString("id-ID");

    labels.push(waktu);
    dataSuhu.push(suhu);
    dataKelembapan.push(kelembapan);

    // hanya tampilkan 20 data terakhir
    if (labels.length > 20) {
        labels.shift();
        dataSuhu.shift();
        dataKelembapan.shift();
    }

    chartSuhu.update();
    chartKelembapan.update();

    document.getElementById("dataTerakhir").innerText = waktu;
}

setInterval(updateSensor, 3000);
updateSensor();